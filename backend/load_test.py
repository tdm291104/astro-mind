"""
Load test script cho AstroMind — dry_run=True, không gọi Anthropic API.
Chạy: uv run python load_test.py
"""
import asyncio
import json
import os
import statistics
import time
import resource

import httpx

BASE_URL = "http://localhost:8000"
# Dùng admin account (team plan — requests_per_day=null, không bị 429)
TEST_EMAIL = os.getenv("ADMIN_EMAIL", "admin@astromind.com")
TEST_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpass123")
TEST_NAME = "LoadTestAdmin"

CONCURRENCY_LEVELS = [1, 5, 10, 20, 50, 100, 200, 300, 500]
REQUESTS_PER_LEVEL = 30   # số request mỗi mức concurrent
FAILURE_THRESHOLD = 0.10  # dừng nếu failure rate > 10%
TIMEOUT_S = 30.0


async def setup_user(client: httpx.AsyncClient) -> bool:
    """Đăng ký + đăng nhập, trả True nếu thành công."""
    await client.post("/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "display_name": TEST_NAME,
    })
    r = await client.post("/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    return r.status_code == 200


async def single_request(client: httpx.AsyncClient) -> dict:
    """Gửi 1 request /converse dry_run, đọc SSE đến done. Trả metrics."""
    start = time.perf_counter()
    success = False
    first_byte = None
    route = None
    error = None

    try:
        async with client.stream(
            "POST", "/converse",
            json={"message": "Thiên hà Milky Way hình thành như thế nào?", "dry_run": True},
            timeout=TIMEOUT_S,
        ) as resp:
            if resp.status_code != 200:
                error = f"HTTP {resp.status_code}"
            else:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    if first_byte is None:
                        first_byte = time.perf_counter() - start
                    try:
                        ev = json.loads(line[6:])
                        if ev.get("type") == "done":
                            route = ev.get("route")
                            success = True
                            break
                        if ev.get("type") == "error":
                            error = ev.get("message", "SSE error")
                            break
                    except json.JSONDecodeError:
                        pass
    except httpx.TimeoutException:
        error = f"timeout >{TIMEOUT_S}s"
    except Exception as e:
        error = str(e)[:80]

    total = time.perf_counter() - start
    return {
        "success": success,
        "total_s": round(total, 3),
        "first_byte_s": round(first_byte, 3) if first_byte else None,
        "route": route,
        "error": error,
    }


async def run_level(concurrency: int, cookies: dict) -> dict:
    """Chạy REQUESTS_PER_LEVEL request với concurrency đồng thời."""
    limits = httpx.Limits(max_connections=concurrency + 5,
                          max_keepalive_connections=concurrency + 5)
    async with httpx.AsyncClient(
        base_url=BASE_URL,
        cookies=cookies,
        limits=limits,
        timeout=TIMEOUT_S + 5,
    ) as client:
        sem = asyncio.Semaphore(concurrency)

        async def bounded(i):
            async with sem:
                return await single_request(client)

        results = await asyncio.gather(
            *[bounded(i) for i in range(REQUESTS_PER_LEVEL)],
            return_exceptions=True,
        )

    metrics = []
    errors = []
    for r in results:
        if isinstance(r, Exception):
            errors.append(str(r))
        elif r["success"]:
            metrics.append(r)
        else:
            errors.append(r.get("error", "unknown"))

    total_s = [m["total_s"] for m in metrics]
    fb_s = [m["first_byte_s"] for m in metrics if m["first_byte_s"]]

    return {
        "concurrency": concurrency,
        "total_requests": REQUESTS_PER_LEVEL,
        "success": len(metrics),
        "failed": len(errors),
        "failure_rate": round(len(errors) / REQUESTS_PER_LEVEL, 3),
        "latency_median_s": round(statistics.median(total_s), 3) if total_s else None,
        "latency_p95_s": round(sorted(total_s)[int(len(total_s) * 0.95) - 1], 3) if len(total_s) >= 2 else None,
        "latency_max_s": round(max(total_s), 3) if total_s else None,
        "first_byte_median_s": round(statistics.median(fb_s), 3) if fb_s else None,
        "errors": errors[:5],
    }


def get_ram_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF)
    # macOS: ru_maxrss in bytes; Linux: in KB
    if hasattr(resource, 'RLIMIT_AS'):  # Linux
        return round(usage.ru_maxrss / 1024, 1)
    return round(usage.ru_maxrss / 1024 / 1024, 1)  # macOS bytes→MB


async def main():
    print(f"\n{'='*60}")
    print(" AstroMind Load Test — dry_run=True (no API calls)")
    print(f"{'='*60}")
    print(f" Base URL : {BASE_URL}")
    print(f" Levels   : {CONCURRENCY_LEVELS}")
    print(f" Req/level: {REQUESTS_PER_LEVEL}")
    print(f"{'='*60}\n")

    # Setup
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        r = await client.get("/health")
        if r.status_code != 200:
            print("❌ Backend not running. Start with: uv run astromind serve")
            return

        ok = await setup_user(client)
        if not ok:
            print("❌ Login failed.")
            return
        cookies = dict(client.cookies)
        print(f"✅ Backend healthy. User ready. Cookies: {list(cookies.keys())}\n")

    all_results = []
    max_safe_concurrency = 1

    for level in CONCURRENCY_LEVELS:
        print(f"▶  Concurrency={level:>3} | ", end="", flush=True)
        t0 = time.perf_counter()
        result = await run_level(level, cookies)
        elapsed = time.perf_counter() - t0

        rps = round(result["success"] / elapsed, 2)
        result["rps"] = rps
        result["ram_mb"] = get_ram_mb()
        all_results.append(result)

        status = "✅" if result["failure_rate"] <= 0.05 else "⚠️ " if result["failure_rate"] <= FAILURE_THRESHOLD else "❌"
        print(
            f"{status} "
            f"OK={result['success']}/{result['total_requests']} "
            f"fail={result['failure_rate']*100:.0f}% "
            f"p50={result['latency_median_s']}s "
            f"p95={result['latency_p95_s']}s "
            f"rps={rps}"
        )

        if result["errors"]:
            print(f"   Errors: {result['errors'][:3]}")

        if result["failure_rate"] <= 0.05:
            max_safe_concurrency = level

        if result["failure_rate"] > FAILURE_THRESHOLD:
            print(f"\n⛔  Failure rate {result['failure_rate']*100:.0f}% > {FAILURE_THRESHOLD*100:.0f}% — stopping.")
            break

    # Summary
    print(f"\n{'='*60}")
    print(f" SUMMARY")
    print(f"{'='*60}")
    print(f" Max safe concurrency (failure <5%): {max_safe_concurrency} users")
    best = next((r for r in all_results if r["concurrency"] == max_safe_concurrency), None)
    if best:
        print(f" At {max_safe_concurrency} concurrent users:")
        print(f"   Median latency : {best['latency_median_s']}s")
        print(f"   P95 latency    : {best['latency_p95_s']}s")
        print(f"   Throughput     : {best['rps']} req/s")
        print(f"   Failure rate   : {best['failure_rate']*100:.0f}%")

    # Save JSON for docs
    output = {
        "test_mode": "dry_run (no external API calls)",
        "base_url": BASE_URL,
        "requests_per_level": REQUESTS_PER_LEVEL,
        "max_safe_concurrency": max_safe_concurrency,
        "results": all_results,
    }
    with open("load_test_results.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n📄 Results saved to load_test_results.json")
    return output


if __name__ == "__main__":
    asyncio.run(main())
