# Ước tính chi phí API — tối ưu Batch API & Prompt Caching cho Agent Eval

**Tổng kết:** Với một lượt chạy đầy đủ (unlimited) của cả 6 script đánh giá trong `backend/src/agent_eval/`, việc áp dụng Batch API (giảm 50% cho các nhóm lệnh gọi độc lập, batch-được) và Prompt Caching ở Orchestrator (áp dụng cho mọi lệnh gọi routing, không điều kiện) ước tính giảm tổng chi phí Anthropic API khoảng **33%** (từ ≈$2.70 xuống ≈$1.80 trên 424 lệnh gọi). Mức giảm khác nhau đáng kể theo từng script — từ 50% (các script thuần Haiku, batch toàn bộ) tới ~27-31% (hai script có vòng lặp ReAct/routing sống, không batch được nhưng vẫn được cache).

**Ngày kiểm tra giá:** 2026-06-22. Giá đã được xác minh trực tiếp qua WebFetch tới `https://platform.claude.com/docs/en/about-claude/pricing` trong phiên làm việc này — các mức giá Haiku 4.5 ($1/$5 mỗi MTok input/output), Sonnet 4.6 ($3/$15 mỗi MTok input/output), chiết khấu Batch API (50% cả input/output, cả hai model), và hệ số prompt caching (cache write 5 phút = 1.25× giá input gốc, cache read = 0.1× giá input gốc) đều khớp chính xác với số liệu đầu vào của kế hoạch — không có chênh lệch cần điều chỉnh.

Đây là **ước tính**, không phải số đo thực tế từ instrumentation per-call (việc đo token/cost theo từng lệnh gọi là một kịch bản đánh giá riêng, được defer sang sau).

---

## Bước 1 — Đầu vào

### Số lượng lệnh gọi mỗi lượt chạy đầy đủ (không đổi do batching/caching chỉ giảm *giá mỗi lệnh gọi*, không giảm *số lệnh gọi*)

| Script | Model | Calls/full run | Batch được? | Cache được? |
|---|---|---|---|---|
| `run_guard_eval.py` | Haiku | 32 | Có (toàn bộ) | Không (dưới ngưỡng tối thiểu 4096 token) |
| `run_image_eval.py` | Haiku | 13–26 (≈20 avg) | Có (2 vòng) | Không |
| `run_notebook_eval.py` | Haiku | 31–62 (≈45 avg) | Có (bước synthesize) | Không |
| `run_report_eval.py` | Haiku (keyword, 10) + Sonnet (write 10 + judge 10 + trend ≈16) | ≈46 | Có (keyword/write/judge); Không (trend, quá ít lệnh gọi) | Không |
| `run_search_eval.py` | Sonnet (routing, ≈48) + Haiku (translate+score, 96) | ≈144 | Không (routing); Có (translate+score) | Có (routing, qua orchestrator cache) |
| `run_route_eval.py` | Sonnet (routing, ≈87) + Haiku (sub-agent dispatch, ≈50) | ≈137 | Không (toàn bộ ReAct sống) | Có (routing, qua orchestrator cache) |

### Token trung bình mỗi lệnh gọi (ước tính)

| Loại lệnh gọi | Input avg | Output avg |
|---|---|---|
| Guard classify | 500 | 5 |
| Image analyze (gộp stage 1+2) | 1500 | 250 |
| Notebook synthesize | 2500 | 400 |
| Report keyword extraction | 100 | 40 |
| Report write (research/trending) | 1800 | 1800 |
| Report judge | 2000 | 60 |
| Report trend analysis | 300 | 200 |
| Search translate | 50 | 20 |
| Search score | 600 | 80 |
| Orchestrator routing (mỗi vòng ReAct) | 2500 | 400 |
| Sub-agent dispatch (proxy, xem chú thích*) | 1030 | 151 |

*\* `run_route_eval.py`'s sub-agent dispatch calls (Haiku, gọi chat/notebook/image agent từ trong vòng ReAct) không có dòng token trung bình riêng trong spec. Dùng giá trị trung bình cộng (blended average) của 5 loại lệnh gọi Haiku đã biết (guard 500/5, image 1500/250, notebook 2500/400, search-translate 50/20, search-score 600/80) làm proxy hợp lý: input avg = 1030, output avg = 151. Đây là giả định rõ ràng, không phải số đo — nếu cần độ chính xác cao hơn, nên đo trực tiếp bằng instrumentation per-call trong tương lai.*

### Giá (đã xác minh 2026-06-22)

- Claude Haiku 4.5: $1.00 / MTok input, $5.00 / MTok output
- Claude Sonnet 4.6: $3.00 / MTok input, $15.00 / MTok output
- Batch API: 50% giá input/output chuẩn, cho cả hai model
- Prompt caching: cache write 1.25× giá input gốc (TTL 5 phút), cache read 0.1× giá input gốc

---

## Bước 2 — Chi phí trước/sau theo từng script

### 1. `run_guard_eval.py` — Haiku, 32 calls, batch toàn bộ

```
before = 32 × 500 × $1/Mtok + 32 × 5 × $5/Mtok
       = $0.0160 + $0.0008 = $0.0168
after  = before × 0.5 (batch 50%) = $0.0084
giảm   = 50.00%
```

### 2. `run_image_eval.py` — Haiku, ≈20 calls avg, batch toàn bộ (2 vòng)

```
before = 20 × 1500 × $1/Mtok + 20 × 250 × $5/Mtok
       = $0.0300 + $0.0250 = $0.0550
after  = before × 0.5 = $0.0275
giảm   = 50.00%
```

### 3. `run_notebook_eval.py` — Haiku, ≈45 calls avg, batch toàn bộ (bước synthesize)

```
before = 45 × 2500 × $1/Mtok + 45 × 400 × $5/Mtok
       = $0.1125 + $0.0900 = $0.2025
after  = before × 0.5 = $0.1013
giảm   = 50.00%
```

### 4. `run_report_eval.py` — Haiku (keyword) + Sonnet (write/judge/trend)

4 nhóm tách riêng:

```
keyword (Haiku, 10 calls, batch):
  before = 10×100×$1/Mtok + 10×40×$5/Mtok = $0.0010 + $0.0020 = $0.0030
  after  = before × 0.5 = $0.0015

write (Sonnet, 10 calls, batch):
  before = 10×1800×$3/Mtok + 10×1800×$15/Mtok = $0.0540 + $0.2700 = $0.3240
  after  = before × 0.5 = $0.1620

judge (Sonnet, 10 calls, batch):
  before = 10×2000×$3/Mtok + 10×60×$15/Mtok = $0.0600 + $0.0090 = $0.0690
  after  = before × 0.5 = $0.0345

trend (Sonnet, ≈16 calls, KHÔNG batch — quá ít lệnh gọi):
  before = 16×300×$3/Mtok + 16×200×$15/Mtok = $0.0144 + $0.0480 = $0.0624
  after  = before (không đổi) = $0.0624

TOTAL: calls = 10+10+10+16 = 46
before = 0.0030+0.3240+0.0690+0.0624 = $0.4584
after  = 0.0015+0.1620+0.0345+0.0624 = $0.2604
giảm   = 43.19%
```

### 5. `run_search_eval.py` — Sonnet routing (≈48, cache, không batch) + Haiku translate+score (96, batch)

**Routing (Sonnet, 48 calls, có cache, không batch):**

```
before = 48×2500×$3/Mtok + 48×400×$15/Mtok = $0.3600 + $0.2880 = $0.6480

after: tách input mỗi call thành block cache (1500 tok, tĩnh) + phần còn lại
       (1000 tok, lịch sử hội thoại tăng dần — không cache được)
  cache write (1 call đầu, 1500 tok × 1.25× giá input):
    = 1 × 1500 × $3/Mtok × 1.25 = $0.0056
  cache read (47 calls còn lại, 1500 tok × 0.1× giá input):
    = 47 × 1500 × $3/Mtok × 0.1 = $0.0212
  phần còn lại input (48 calls × 1000 tok, giá chuẩn — không batch, không cache):
    = 48 × 1000 × $3/Mtok = $0.1440
  output (48 calls × 400 tok, giá chuẩn — không batch):
    = 48 × 400 × $15/Mtok = $0.2880
  after = 0.0056 + 0.0212 + 0.1440 + 0.2880 = $0.4588

giảm routing = (1 − 0.4588/0.6480) × 100 = 29.20%
```

**Translate + score (Haiku, 96 calls, batch — giả định chia đều 48 translate + 48 score):**

```
translate: before = 48×50×$1/Mtok + 48×20×$5/Mtok = $0.0024 + $0.0048 = $0.0072
score:     before = 48×600×$1/Mtok + 48×80×$5/Mtok = $0.0288 + $0.0192 = $0.0480
before (translate+score) = $0.0072 + $0.0480 = $0.0552
after  = before × 0.5 (batch) = $0.0276
```

**Tổng `run_search_eval.py`:**

```
calls = 48 + 48 + 48 = 144
before = 0.6480 + 0.0552 = $0.7032
after  = 0.4588 + 0.0276 = $0.4864
giảm   = (1 − 0.4864/0.7032) × 100 = 30.83%
```

### 6. `run_route_eval.py` — Sonnet routing (≈87, cache, không batch) + Haiku sub-agent dispatch (≈50, không batch, không cache)

**Routing (Sonnet, 87 calls, có cache, không batch) — cùng công thức cache như script #5:**

```
before = 87×2500×$3/Mtok + 87×400×$15/Mtok = $0.6525 + $0.5220 = $1.1745

after:
  cache write (1 call, 1500 tok × 1.25×): = 1×1500×$3/Mtok×1.25 = $0.0056
  cache read (86 calls, 1500 tok × 0.1×): = 86×1500×$3/Mtok×0.1 = $0.0387
  phần còn lại input (87 calls × 1000 tok, giá chuẩn): = 87×1000×$3/Mtok = $0.2610
  output (87 calls × 400 tok, giá chuẩn): = 87×400×$15/Mtok = $0.5220
  after = 0.0056 + 0.0387 + 0.2610 + 0.5220 = $0.8273

giảm routing = (1 − 0.8273/1.1745) × 100 = 29.56%
```

**Sub-agent dispatch (Haiku, 50 calls, KHÔNG batch, KHÔNG cache — không đổi):**

```
before = 50×1030×$1/Mtok + 50×151×$5/Mtok = $0.0515 + $0.0378 = $0.0892
after  = before (không có tối ưu áp dụng) = $0.0892
```

**Tổng `run_route_eval.py`:**

```
calls = 87 + 50 = 137
before = 1.1745 + 0.0892 = $1.2638
after  = 0.8273 + 0.0892 = $0.9166
giảm   = (1 − 0.9166/1.2638) × 100 = 27.47%
```

---

## Bảng tổng hợp

| Script | Calls (before=after) | Cost before | Cost after | % giảm |
|---|---|---|---|---|
| `run_guard_eval.py` | 32 | $0.0168 | $0.0084 | 50.00% |
| `run_image_eval.py` | 20 | $0.0550 | $0.0275 | 50.00% |
| `run_notebook_eval.py` | 45 | $0.2025 | $0.1013 | 50.00% |
| `run_report_eval.py` | 46 | $0.4584 | $0.2604 | 43.19% |
| `run_search_eval.py` | 144 | $0.7032 | $0.4864 | 30.83% |
| `run_route_eval.py` | 137 | $1.2638 | $0.9166 | 27.47% |
| **TỔNG** | **424** | **$2.6997** | **$1.8005** | **33.31%** |

---

## Bước 3 — Phần không tối ưu được (giá gốc)

Hai phần dưới đây **không thể** dùng Batch API, vì chúng nằm trong vòng lặp ReAct sống của Orchestrator — mỗi lệnh gọi phụ thuộc kết quả của lệnh gọi trước (tool_use → tool_result → tiếp tục), nên không thể gom thành một batch xử lý song song/độc lập như Anthropic Message Batches API yêu cầu:

- **`run_route_eval.py` (toàn bộ)** — cả phần routing (Sonnet, ≈87 calls) và phần sub-agent dispatch (Haiku, ≈50 calls) đều chạy live, tuần tự, theo từng bước ReAct.
- **`run_search_eval.py` — phần routing call** (Sonnet, ≈48 calls) — riêng phần translate+score (Haiku, 96 calls) của script này VẪN batch được vì đó là các lệnh gọi độc lập, không phụ thuộc lẫn nhau.

**Tuy nhiên, các phần này không hoàn toàn "không tối ưu":** Prompt Caching ở Orchestrator áp dụng vô điều kiện cho MỌI lệnh gọi routing, bất kể batch được hay không. Trong cả hai script, lệnh gọi routing đầu tiên ghi cache (trả giá cache-write 1.25×) và tất cả lệnh gọi routing tiếp theo trong cùng lượt chạy đọc từ cache (trả giá cache-read 0.1× cho phần block ≈1500 token tĩnh) — vì các script này hoàn thành trong vài giây đến vài phút, hoàn toàn trong TTL 5 phút của cache. Kết quả: phần routing của `run_search_eval.py` vẫn giảm ≈29.2% và phần routing của `run_route_eval.py` vẫn giảm ≈29.6%, chỉ riêng phần sub-agent dispatch của `run_route_eval.py` (Haiku, không cache vì không qua orchestrator system prompt) là hoàn toàn ở giá gốc, không đổi.

---

## Ghi chú & giới hạn

- Đây là ước tính dựa trên số lệnh gọi trung bình và token trung bình mỗi loại — không phải số đo thực tế từ một lượt chạy full đã instrument. Số lệnh gọi thực tế dao động theo dữ liệu test cụ thể (ví dụ image eval 13–26 calls, notebook eval 31–62 calls).
- Token trung bình cho "sub-agent dispatch" trong `run_route_eval.py` là proxy (blended average) do spec không cung cấp số đo riêng cho loại lệnh gọi này — xem chú thích ở Bước 1.
- `run_search_eval.py`'s translate+score (96 calls) được giả định chia đều 48/48 giữa hai loại lệnh gọi (translate 50/20 tok, score 600/80 tok) vì spec không phân chia tỷ lệ cụ thể.
- Để có số đo chính xác hơn ước tính này, cần instrumentation per-call (token/cost thực tế từ response usage) — đây là một kịch bản đánh giá riêng, được defer sang sau theo kế hoạch.
