import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator

from agents import llm
from agents.base import (
    ActionEvent,
    AgentEvent,
    DoneEvent,
    ErrorEvent,
    ObserveEvent,
    TextDeltaEvent,
    ThinkingEvent,
)
from agents.conversation import ConversationMemory
from agents.notebook import NotebookAgent, NotebookResult
from agents.report_agent import ReportAgent
from agents.search import SearchAgent, _WEB_RECENCY_DAYS_DEFAULT
from agents.tools import ORCHESTRATOR_TOOLS
from persistence.embed import Embedder
from persistence.rerank import Reranker
from persistence.store import MetaStore
from persistence.vector import VectorStore

MAX_ITER = 5

_CONFIDENCE_VI = {"high": "cao", "medium": "trung bình", "low": "thấp"}


def _format_image_analysis_text(objects_data: list[dict], morphology_context: str | None) -> str:
    """Human-readable Vietnamese summary of detected objects (no raw JSON)."""
    lines = ["Kết quả phân tích ảnh:"]
    for obj in objects_data:
        confidence = _CONFIDENCE_VI.get(obj["confidence"], obj["confidence"])
        lines.append(f"- {obj['description']} (độ tin cậy: {confidence})")
    if morphology_context:
        lines.append("")
        lines.append(
            "✓ Đã phân tích hình thái chi tiết bằng mô hình CNN (Galaxy Zoo) "
            "để xác định cấu trúc thiên hà."
        )
    return "\n".join(lines)


_SYSTEM_PROMPT_BODY = (
    "Bạn là AstroMind — người cộng tác thiên văn học, cùng người dùng khám phá và hiểu vũ trụ "
    "qua hội thoại, phân tích ảnh, tra cứu tài liệu và tổng hợp nghiên cứu.\n\n"
    "Cách trả lời:\n"
    "Với câu hỏi thiên văn chung, giải thích khái niệm, hoặc hội thoại thông thường (chào hỏi, "
    "cảm ơn, theo dõi câu trước) — trả lời thẳng từ kiến thức, không cần gọi tool.\n"
    "Câu xác nhận ('... phải không?'): bắt đầu bằng 'Đúng' hoặc 'Sai', rồi mới giải thích. "
    "Không dùng 'đúng một phần' — nếu tổng thể sai dù có chi tiết đúng, vẫn trả lời Sai.\n"
    "Không dùng emoji, không thêm tiêu đề ## trừ khi đang viết báo cáo. "
    "Trả lời bằng ngôn ngữ người dùng đang dùng (mặc định tiếng Việt).\n\n"
    "Công cụ có sẵn:\n\n"
    "analyze_astronomy_image — nhận dạng thiên thể trong ảnh\n"
    "Gọi ngay khi user gửi ảnh. Nếu nhận ra thiên thể → tiếp tục tìm kiếm với "
    "query '{sub_type} {class_name} astronomy'. Nếu không nhận ra → hỏi user mô tả thêm.\n\n"
    "call_search_agent(query, sources?, web_days?) — tìm kiếm thông tin thiên văn\n"
    "sources: 'images' = ảnh NASA · 'arxiv' = paper · 'web' = tin tức · 'apod' = ảnh ngày hôm nay\n"
    "Không truyền sources = tìm tất cả.\n"
    "Query luôn bằng tiếng Anh dù user hỏi tiếng Việt (vd: 'hố đen siêu khối lượng' → 'supermassive black hole').\n"
    "web_days mặc định 90 ngày; truyền web_days=0 khi user hỏi về thời điểm cụ thể trong quá khứ "
    "(vd: 'nhật thực năm 2017') để tìm được bài cũ hơn.\n"
    "Khi kết quả trả về ảnh markdown ![title](url) → giữ nguyên trong câu trả lời, không thay bằng text.\n\n"
    "call_notebook_agent — tra cứu và trích dẫn từ tài liệu user đã upload\n"
    "Ưu tiên dùng khi user hỏi về nội dung tài liệu của họ.\n\n"
    "call_report_agent(topic, report_type) — tạo báo cáo thiên văn chuyên sâu\n"
    "report_type 'research' hoặc 'trending': cần topic cụ thể, giữ nguyên ngôn ngữ của user "
    "(topic dùng làm tiêu đề báo cáo, không dịch sang tiếng Anh).\n"
    "report_type 'discovery': khi user muốn tổng hợp phiên chat, không cần topic.\n\n"
    "Xử lý yêu cầu nhiều ý: một câu có thể gồm nhiều ý định (phân tích ảnh + tìm kiếm + báo cáo). "
    "Trước khi kết thúc, kiểm tra đã đủ chưa — gọi thêm tool nếu cần. Tối đa 5 vòng tool."
)


def _build_system_prompt() -> list[dict]:
    """Two blocks: a small uncached date prefix (changes daily) and the stable
    body marked with cache_control so it's reused across every ReAct iteration
    and every test item in a run, instead of being billed as fresh input each
    time (~510 tokens, well above Sonnet's 1024-token cache minimum once
    combined with the tools array)."""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    return [
        {"type": "text", "text": f"Ngày hiện tại: {today}.\n\n"},
        {"type": "text", "text": _SYSTEM_PROMPT_BODY, "cache_control": {"type": "ephemeral"}},
    ]


@dataclass
class OrchestratorAgent:
    api_key: str | None
    model: str          # Orchestrator — Sonnet/Opus with extended thinking
    model_light: str    # Sub-agents (chat, notebook) — Haiku for speed/cost
    nasa_api_key: str
    tavily_key: str
    store: MetaStore | None
    vector: VectorStore | None
    embedder: Embedder | None
    reranker: Reranker | None = None
    serpapi_api_key: str = ""
    user_id: str | None = None
    doc_ids: list[str] | None = None
    conversation_id: str | None = None
    enabled_sources: set[str] | None = None
    image_data: str | None = None  # base64 data URL for the current turn's image
    images_dir: object | None = None  # pathlib.Path to images_dir for history vision blocks

    async def run(
        self,
        user_message: str,
        memory: ConversationMemory,
        *,
        dry_run: bool = False,
    ) -> AsyncIterator[AgentEvent]:
        if dry_run:
            async for event in self._dry_run(user_message, memory):
                yield event
            return

        messages = self._build_messages(user_message, memory)
        final_text = ""
        citations: list = []
        arxiv_papers: list = []
        web_sources: list = []
        route = "chat"
        report_id: str | None = None
        image_analysis_data: dict | None = None
        _ROUTE_PRI = {"report": 4, "notebook": 3, "notebook_fallback_chat": 3,
                      "image": 2, "search": 1, "search_web": 1}

        try:
            for _ in range(MAX_ITER):
                content, stop_reason = await llm.stream_react_step(
                    messages,
                    api_key=self.api_key,
                    model=self.model,
                    tools=ORCHESTRATOR_TOOLS,
                    system=_build_system_prompt(),
                    budget_tokens=5000,
                )

                assistant_content = list(content)
                has_tool_use = any(b.type == "tool_use" for b in assistant_content)
                for block in assistant_content:
                    if block.type == "thinking":
                        yield ThinkingEvent(preview=block.thinking)
                    elif block.type == "tool_use":
                        yield ActionEvent(tool=block.name, args=block.input)
                    elif block.type == "text" and not has_tool_use:
                        # Skip intermediate narration ("Tôi sẽ...") that precedes tool calls
                        final_text += block.text
                        yield TextDeltaEvent(delta=block.text)

                messages.append({"role": "assistant", "content": assistant_content})

                if stop_reason == "end_turn":
                    break

                tool_results = []
                for block in assistant_content:
                    if block.type != "tool_use":
                        continue
                    (
                        result, block_citations, block_route, block_report_id,
                        block_papers, block_analysis_data, block_web_sources,
                    ) = await self._dispatch_tool(block.name, block.input, dry_run=dry_run)
                    if block_citations:
                        citations.extend(block_citations)
                    if block_papers:
                        arxiv_papers.extend(block_papers)
                    if block_web_sources:
                        web_sources.extend(block_web_sources)
                    if _ROUTE_PRI.get(block_route, 0) > _ROUTE_PRI.get(route, 0):
                        route = block_route
                    if block_report_id:
                        report_id = block_report_id
                    if block_route == "image" and block_analysis_data is not None:
                        image_analysis_data = block_analysis_data
                    yield ObserveEvent(summary=str(result))
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": str(result),
                    })

                if tool_results:
                    messages.append({"role": "user", "content": tool_results})

        except Exception as exc:
            yield ErrorEvent(message=str(exc))
            return

        memory.add_user(user_message)
        memory.add_assistant(final_text)

        suggested_action = self._suggest_action(
            route=route, image_analysis_data=image_analysis_data,
            citations=citations, arxiv_papers=arxiv_papers,
        )

        yield DoneEvent(
            route=route, citations=[c.to_dict() for c in citations], arxiv_papers=arxiv_papers,
            web_sources=web_sources, report_id=report_id, analysis_data=image_analysis_data,
            suggested_action=suggested_action,
        )

    async def _dispatch_tool(
        self, name: str, args: dict, *, dry_run: bool
    ) -> tuple[str, list, str, str | None, list, dict | None, list]:
        if name == "analyze_astronomy_image":
            if not self.image_data:
                return "Không có ảnh nào được đính kèm.", [], "chat", None, [], None, []
            if dry_run:
                return (
                    '[dry-run] {"detected_objects": [{"class_name": "galaxy", '
                    '"sub_type": "spiral", "confidence": "high", "description": "Test galaxy"}]}',
                    [], "chat", None, [], None, [],
                )
            from agents.image_agent import ImageAgent
            img_agent = ImageAgent()
            result = await img_agent.analyze(
                image_data=self.image_data,
                user_question=args.get("question", ""),
                api_key=self.api_key,
                model=self.model_light,
            )
            if not result.detected_objects:
                return (
                    "Không nhận ra thiên thể nào trong ảnh này. "
                    "Có thể ảnh không phải ảnh thiên văn hoặc chất lượng chưa đủ rõ.",
                    [], "image", None, [], None,
                )
            objects_data = [
                {
                    "class_name": o.class_name,
                    "sub_type": o.sub_type,
                    "confidence": o.confidence,
                    "description": o.description,
                }
                for o in result.detected_objects
            ]
            analysis_data = {
                "detected_objects": objects_data,
                "morphology_context": result.morphology_context,
            }
            return (
                _format_image_analysis_text(objects_data, result.morphology_context),
                [], "image", None, [], analysis_data, [],
            )

        if name == "call_search_agent":
            search = SearchAgent(
                nasa_api_key=self.nasa_api_key,
                tavily_key=self.tavily_key,
                api_key=self.api_key,
            )
            result = await search.run(
                args.get("query", ""),
                sources=args.get("sources"),
                # web_days=0 → no filter (historical queries); absent → default 90 days
                web_days=args.get("web_days", _WEB_RECENCY_DAYS_DEFAULT),
                dry_run=dry_run,
            )
            return result.text, [], "search", None, result.arxiv_papers, None, result.web_sources

        if name == "call_notebook_agent":
            if self.store is None or self.vector is None or self.embedder is None:
                return "Notebook không khả dụng.", [], "notebook", None, [], None, []
            nb = NotebookAgent(
                store=self.store,
                vector=self.vector,
                embedder=self.embedder,
                api_key=self.api_key,
                model=self.model_light,
                user_id=self.user_id,
                reranker=self.reranker,
            )
            nb_result = await asyncio.to_thread(
                nb.run,
                args.get("question", ""),
                doc_ids=args.get("doc_ids") or self.doc_ids,
                dry_run=dry_run,
            )
            return nb_result.text, nb_result.citations, "notebook", None, [], None, []

        if name == "call_report_agent":
            if not self.store or not self.user_id:
                return "Report agent không khả dụng.", [], "report", None, [], None, []

            topic = args.get("topic", "")
            report_type = args.get("report_type", "research")

            if dry_run:
                return f"[dry-run] Đang tạo báo cáo về: {topic}", [], "report", None, [], None, []

            from agents.report_agent import _EMPTY_PAYLOAD
            if report_type == "discovery" and not topic.strip():
                title = "Báo cáo khám phá phiên làm việc"
            else:
                label = topic[:60].strip()
                title = f"Báo cáo: {label}"
            initial_payload = {**_EMPTY_PAYLOAD, "report_type": report_type}
            report_id = self.store.create_report(self.user_id, title, initial_payload)

            agent = ReportAgent(
                api_key=self.api_key,
                model=self.model,
                model_light=self.model_light,
                tavily_key=self.tavily_key,
                serpapi_api_key=self.serpapi_api_key,
                store=self.store,
                user_id=self.user_id,
                vector=self.vector,
                embedder=self.embedder,
                reranker=self.reranker,
            )

            doc_ids = args.get("doc_ids") or self.doc_ids

            async def _bg_generate() -> None:
                await asyncio.to_thread(
                    agent.run_update, report_id, topic,
                    report_type=report_type, doc_ids=doc_ids, conversation_id=self.conversation_id,
                )

            asyncio.create_task(_bg_generate())

            summary = (
                f"Đang tạo báo cáo '{title}' trong nền. "
                "Bạn có thể tiếp tục chat — tôi sẽ thông báo ngay khi báo cáo hoàn tất."
            )
            return summary, [], "report", report_id, [], None, []

        return f"Unknown tool: {name}", [], "chat", None, [], None, []

    def _suggest_action(
        self, *, route: str, image_analysis_data: dict | None,
        citations: list, arxiv_papers: list,
    ) -> dict | None:
        """Heuristic: suggest a discovery report when this session has both an
        analyzed image and other research context (notebook/arXiv/search).

        Looks at the current turn's results plus prior turns via `store.get_messages()`
        — the current turn's message is not yet persisted when this runs.
        """
        if not self.conversation_id or not self.store or route == "report":
            return None

        has_image = route == "image" and image_analysis_data is not None
        has_context = bool(citations) or bool(arxiv_papers) or route in ("notebook", "search", "search_web")

        if not has_image or not has_context:
            for m in self.store.get_messages(self.conversation_id):
                if not has_image and m.get("route") == "image" and (m.get("analysis_data") or {}).get("detected_objects"):
                    has_image = True
                if not has_context and (
                    m.get("route") == "notebook"
                    or m.get("arxiv_papers")
                    or (m.get("route") or "").startswith("search")
                ):
                    has_context = True

        if has_image and has_context:
            return {"type": "discovery_report"}
        return None

    def _vision_content(self, image_url: str, text: str) -> list | str:
        """Build a vision content block list from a stored image_url path."""
        if not self.images_dir:
            return text
        try:
            import base64 as _b64
            import mimetypes
            from pathlib import Path
            filename = image_url.rsplit("/", 1)[-1]
            path = Path(str(self.images_dir)) / filename
            if not path.exists():
                return text
            data = _b64.b64encode(path.read_bytes()).decode()
            media_type = mimetypes.types_map.get(path.suffix.lower(), "image/jpeg")
            return [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data}},
                {"type": "text", "text": text},
            ]
        except Exception:
            return text

    def _build_messages(self, user_message: str, memory: ConversationMemory) -> list:
        msgs = []
        for m in memory.messages():
            image_url = m.get("image_url")  # type: ignore[call-overload]
            if m["role"] == "user" and image_url:
                content = self._vision_content(image_url, m["content"])
            else:
                content = m["content"]
            msgs.append({"role": m["role"], "content": content})

        text = user_message
        if self.doc_ids:
            ids_str = ", ".join(self.doc_ids)
            text += (
                f"\n\n[Hệ thống: người dùng đã đính kèm tài liệu doc_ids=[{ids_str}]. "
                "Hãy dùng call_notebook_agent với các doc_ids này để trả lời câu hỏi về tài liệu.]"
            )
        if self.image_data:
            text += (
                "\n\n[Hệ thống: người dùng đã gửi kèm ảnh thiên văn. "
                "Hãy gọi analyze_astronomy_image TRƯỚC TIÊN để phân tích và nhận dạng thiên thể, "
                "sau đó dùng kết quả để tìm kiếm hoặc trả lời user.]"
            )
        msgs.append({"role": "user", "content": text})
        return msgs

    async def _dry_run(
        self, user_message: str, memory: ConversationMemory
    ) -> AsyncIterator[AgentEvent]:
        yield ThinkingEvent(preview=f"[dry-run] Phân tích: {user_message[:80]}")
        dry_reply = f"[dry-run] {user_message}"
        yield TextDeltaEvent(delta=dry_reply)
        memory.add_user(user_message)
        memory.add_assistant(dry_reply)
        yield DoneEvent(route="chat", citations=[])
