import json
from dataclasses import dataclass
from datetime import UTC, datetime

from agents import llm
from agents.notebook import NotebookAgent
from core.models import Citation
from persistence.embed import Embedder
from persistence.rerank import Reranker
from persistence.store import MetaStore
from persistence.vector import VectorStore

_KEYWORD_SYSTEM = (
    "Extract 3-5 concise English astronomy keywords from the given topic, "
    "suitable for arXiv paper searches. "
    "Return ONLY a JSON array of strings, no explanation. "
    'Example: ["exoplanets", "TESS mission", "transit photometry"]'
)

_RESEARCH_REPORT_SYSTEM = """Bạn là nhà nghiên cứu thiên văn học, viết báo cáo chuyên sâu dựa trên nguồn tham khảo được cung cấp để giúp người đọc hiểu sâu về chủ đề.

Cấu trúc báo cáo (markdown):

## Tổng quan
Tầm quan trọng và vị trí của lĩnh vực trong thiên văn học hiện đại. Bối cảnh lịch sử và lý do quan tâm.

## Các hướng nghiên cứu chính
Liệt kê 4-6 hướng nổi bật, mỗi hướng 2-3 câu giải thích.

## Thành tựu và phát hiện tiêu biểu
Các kết quả quan trọng gần đây, gắn với tên kính thiên văn, sứ mệnh hoặc nhóm nghiên cứu cụ thể.

## Bảng tóm tắt thành tựu
4-6 thành tựu nổi bật dưới dạng bảng markdown: Năm | Thành tựu | Kính thiên văn/Sứ mệnh | Ý nghĩa.

## Phương pháp quan sát và nghiên cứu
Các phương pháp chính đang được áp dụng và tại sao chúng hiệu quả.

## Thách thức và câu hỏi mở
3-5 câu hỏi lớn mà cộng đồng khoa học đang nỗ lực giải đáp.

## Triển vọng tương lai
Dự báo 5-10 năm tới, gắn với các sứ mệnh/công cụ sắp ra mắt (ELT, Roman Space Telescope, LISA...).

## Kết luận
Tóm tắt ngắn các điểm chính và tầm quan trọng của lĩnh vực.

---
Lưu ý:
- Không dùng emoji
- Viết toàn bộ báo cáo (kể cả tiêu đề các phần) bằng ngôn ngữ của "Chủ đề" trong yêu cầu (mặc định tiếng Việt)
- Dẫn số liệu cụ thể khi có (năm phát hiện, khoảng cách, năng lượng...)
- Bảng thành tựu dùng cú pháp markdown chuẩn (hàng | --- |)
- Độ dài: 1500-3000 từ"""

_TRENDING_REPORT_SYSTEM = """Bạn là nhà phân tích xu hướng thiên văn học, viết báo cáo kết hợp bối cảnh khoa học với nhận định dựa trên dữ liệu được cung cấp (số lượng paper arXiv, mức quan tâm tìm kiếm, tác giả/nhóm nổi bật).

Cấu trúc báo cáo (markdown):

## Tóm tắt Xu hướng
2-3 câu về xu hướng nổi bật nhất dựa trên dữ liệu định lượng.

## Tổng quan
Tầm quan trọng và vị trí của lĩnh vực trong thiên văn học hiện đại.

## Các hướng nghiên cứu chính
3-5 hướng nổi bật, mỗi hướng 1-2 câu giải thích.

## Thành tựu và phát hiện tiêu biểu
Các kết quả quan trọng gần đây, gắn với kính thiên văn, sứ mệnh hoặc nhóm nghiên cứu cụ thể.

## Phương pháp quan sát và nghiên cứu
Các phương pháp chính và lý do hiệu quả.

## Thách thức và câu hỏi mở
2-3 câu hỏi lớn cộng đồng khoa học đang nỗ lực giải đáp.

## Dự báo Xu hướng Tương lai
Hướng phát triển 2-5 năm tới dựa trên dữ liệu và các sứ mệnh/công cụ sắp ra mắt.

## Kết luận và Gợi ý
Tóm tắt điểm chính và hướng theo dõi tiếp theo dành cho người đọc.

---
Lưu ý:
- Không dùng emoji
- Viết toàn bộ báo cáo (kể cả tiêu đề các phần) bằng ngôn ngữ của "Chủ đề" trong yêu cầu (mặc định tiếng Việt)
- Dẫn số liệu cụ thể khi có (số paper, % tăng trưởng, năm...)
- Độ dài: 800-1500 từ"""

_DISCOVERY_REPORT_SYSTEM = """Bạn là người cộng tác nghiên cứu thiên văn học. Viết báo cáo tổng hợp những gì người dùng đã khám phá trong phiên làm việc (ảnh đã phân tích, tài liệu đã tra cứu, paper đã tìm thấy) để họ có thể nhìn lại toàn bộ hành trình.

Cấu trúc báo cáo (markdown):

## Tổng quan Phát hiện
1-2 đoạn tóm tắt thiên thể/chủ đề người dùng đã khám phá trong phiên, nêu tên và loại thiên thể nếu có.

## Ngữ cảnh Khoa học
Trình bày ngữ cảnh khoa học liên quan, dựa trên trích dẫn tài liệu và paper arXiv thu thập trong phiên.

## Ý nghĩa và Đánh giá
Liên hệ những gì đã khám phá với kiến thức thiên văn học hiện có, so sánh với các đối tượng/hiện tượng tương tự.

## Gợi ý Tiếp theo
Tóm tắt insight chính và đề xuất câu hỏi mở hoặc hướng tìm hiểu tiếp theo.

---
Lưu ý:
- Không dùng emoji
- Viết toàn bộ báo cáo bằng ngôn ngữ của tin nhắn người dùng trong yêu cầu (mặc định tiếng Việt)
- Không bịa số liệu hoặc chi tiết không có trong ngữ cảnh được cung cấp
- Độ dài: 600-1200 từ"""

def build_keyword_request(topic: str, *, model: str) -> dict:
    """Build the Anthropic request params for keyword extraction. Reusable by
    both the live path (_extract_keywords) and batch-eval code."""
    return llm.build_request(
        [
            {"role": "system", "content": _KEYWORD_SYSTEM},
            {"role": "user", "content": f"Topic: {topic}"},
        ],
        model=model,
        temperature=0.1,
    )


def parse_keyword_response(raw_text: str, topic: str) -> list[str]:
    """Parse a keyword-extraction response into a list of up to 5 keywords,
    falling back to [topic] on any parse failure."""
    try:
        text = raw_text.strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
        if isinstance(parsed, list) and parsed:
            return [str(k) for k in parsed[:5]]
    except Exception:
        pass
    return [topic]


def _build_report_context(
    topic: str, keywords: list[str], web_context: list[dict], papers: list[dict],
    *, top_authors: list[dict] | None = None, notebook_text: str = "", session_text: str = "",
) -> str:
    context_parts: list[str] = []
    if web_context:
        web_lines = [
            f"- {item.get('title', '')}: {(item.get('content') or '')[:300]}"
            for item in web_context[:6]
            if item.get("title") or item.get("content")
        ]
        if web_lines:
            context_parts.append("Nguồn web gần đây:\n" + "\n".join(web_lines))
    if papers:
        paper_lines = [
            f"- {p.get('title', '')} ({(p.get('published') or '')[:7]}): {(p.get('summary') or '')[:200]}"
            for p in papers[:7]
        ]
        context_parts.append("Paper arXiv liên quan:\n" + "\n".join(paper_lines))
    if top_authors:
        authors_str = ", ".join(f"{a['name']} ({a['count']} paper)" for a in top_authors)
        context_parts.append(f"Tác giả xuất hiện nhiều trong các paper gần đây: {authors_str}")
    if notebook_text:
        context_parts.append(
            "Tài liệu cá nhân của người dùng đề cập:\n" + notebook_text +
            "\n\nNếu liên quan đến chủ đề báo cáo, hãy liên hệ nội dung trên trong phần phù hợp."
        )
    if session_text:
        context_parts.append(
            "Bối cảnh phiên làm việc hiện tại của người dùng:\n" + session_text +
            "\n\nNếu liên quan đến chủ đề báo cáo, viết 1 đoạn ngắn (3-4 câu) cuối phần Kết luận "
            "liên hệ với những gì người dùng đã khám phá trong phiên — nếu không liên quan, bỏ qua."
        )

    user_content = f"Chủ đề: {topic}\nTừ khóa: {', '.join(keywords)}"
    if context_parts:
        user_content += "\n\n" + "\n\n".join(context_parts)
    return user_content


def build_research_report_request(
    topic: str, keywords: list[str], web_context: list[dict], papers: list[dict],
    *, model: str, notebook_text: str = "", session_text: str = "",
) -> dict:
    """Build the Anthropic request params for a research-report write call.
    Reusable by both the live path and batch-eval code."""
    user_content = _build_report_context(
        topic, keywords, web_context, papers, notebook_text=notebook_text, session_text=session_text,
    )
    return llm.build_request(
        [
            {"role": "system", "content": _RESEARCH_REPORT_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        model=model,
        temperature=0.4,
    )


def build_trending_report_request(
    topic: str, keywords: list[str], web_context: list[dict], papers: list[dict],
    top_authors: list[dict] | None = None, *, model: str,
    notebook_text: str = "", session_text: str = "",
) -> dict:
    """Build the Anthropic request params for a trending-report write call.
    Reusable by both the live path and batch-eval code."""
    user_content = _build_report_context(
        topic, keywords, web_context, papers, top_authors=top_authors,
        notebook_text=notebook_text, session_text=session_text,
    )
    return llm.build_request(
        [
            {"role": "system", "content": _TRENDING_REPORT_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        model=model,
        temperature=0.4,
    )


_EMPTY_PAYLOAD: dict = {
    "generating": True,
    "report_type": "research",
    "research_text": "",
    "topics": {"rows": [], "analysis": ""},
    "timeline": {"rows": [], "by_method": {"years": [], "series": {}}, "analysis": ""},
    "interest": {"series": {}, "text": ""},
    "references": [],
    "top_authors": [],
    "keywords": [],
    "discovery": None,
    "generated_at": "",
}


def _build_references(
    web_context: list[dict], papers: list[dict], notebook_citations: list[Citation] | None = None,
) -> list[dict]:
    """Build a deterministic reference list from arXiv papers, web search results, and
    Notebook citations.

    Built entirely from already-fetched data — never LLM-generated — to avoid
    hallucinated titles/links.
    """
    references: list[dict] = []
    for p in papers:
        if not p.get("title"):
            continue
        references.append({
            "source": "arxiv",
            "title": p["title"],
            "url": p.get("link", ""),
            "doc_name": "",
            "page": None,
            "excerpt": (p.get("summary") or "")[:200],
        })
    for item in web_context:
        if not item.get("title"):
            continue
        references.append({
            "source": "web",
            "title": item["title"],
            "url": item.get("url", ""),
            "doc_name": "",
            "page": None,
            "excerpt": (item.get("content") or "")[:200],
        })
    for c in notebook_citations or []:
        references.append({
            "source": "notebook",
            "title": c.section or c.doc_name,
            "url": "",
            "doc_name": c.doc_name,
            "page": c.page,
            "excerpt": c.excerpt,
        })
    return references


def _compute_author_frequency(papers: list[dict], top_n: int = 5) -> list[dict]:
    """Count how often each author appears across the given arXiv papers.

    `authors` is a comma-separated string of full names (see sources/arxiv.py).
    Built entirely from already-fetched data — never LLM-generated.
    """
    from collections import Counter

    counter: Counter[str] = Counter()
    for p in papers:
        for name in (p.get("authors") or "").split(", "):
            name = name.strip()
            if name:
                counter[name] += 1
    return [{"name": name, "count": count} for name, count in counter.most_common(top_n)]


@dataclass
class SessionContext:
    """Data already produced earlier in the chat session, reusable for report generation
    without re-calling ImageAgent/NotebookAgent/SearchAgent."""
    images: list[dict]
    notebook_citations: list[dict]
    arxiv_papers: list[dict]
    topic_hint: str | None
    has_data: bool
    language_hint: str | None = None


@dataclass
class ReportAgent:
    api_key: str | None
    model: str
    model_light: str
    tavily_key: str = ""
    serpapi_api_key: str = ""
    store: MetaStore | None = None
    user_id: str | None = None
    vector: VectorStore | None = None
    embedder: Embedder | None = None
    reranker: Reranker | None = None

    def _extract_keywords(self, topic: str) -> list[str]:
        if not self.api_key:
            return [topic]
        params = build_keyword_request(topic, model=self.model_light)
        raw = llm.call(params, api_key=self.api_key)
        return parse_keyword_response(raw, topic)

    def _fetch_web_context(self, topic: str) -> list[dict]:
        if not self.tavily_key:
            return []
        try:
            from sources.websearch import fetch_web
            return fetch_web(
                f"{topic} astronomy research recent discoveries",
                self.tavily_key,
                max_results=6,
                timeout=10.0,
            )
        except Exception:
            return []

    def _fetch_arxiv_papers(self, keywords: list[str]) -> list[dict]:
        try:
            from sources.arxiv import fetch_arxiv
            return fetch_arxiv(" ".join(keywords[:3]), max_results=7, timeout=8.0)
        except Exception:
            return []

    def _fetch_notebook_context(
        self, topic: str, doc_ids: list[str] | None
    ) -> tuple[str, list[Citation]]:
        if not doc_ids or not self.vector or not self.embedder or not self.store:
            return "", []
        try:
            nb = NotebookAgent(
                store=self.store, vector=self.vector, embedder=self.embedder,
                api_key=self.api_key, model=self.model_light, user_id=self.user_id,
                reranker=self.reranker,
            )
            result = nb.run(f"Thông tin liên quan đến {topic}", doc_ids=doc_ids)
            if not result.had_hits:
                return "", []
            return result.text, result.citations
        except Exception:
            return "", []

    def _collect_session_context(self, conversation_id: str) -> SessionContext:
        """Reuse data already surfaced earlier in this chat session (images analyzed,
        Notebook citations, arXiv papers found via search) for report personalization."""
        if not self.store:
            return SessionContext(images=[], notebook_citations=[], arxiv_papers=[], topic_hint=None, has_data=False)

        messages = self.store.get_messages(conversation_id)

        images: list[dict] = []
        notebook_citations: list[dict] = []
        arxiv_papers: list[dict] = []

        for i, m in enumerate(messages):
            analysis_data = m.get("analysis_data")
            if m.get("route") == "image" and analysis_data and analysis_data.get("detected_objects"):
                image_url = m.get("image_url")
                if not image_url and i > 0:
                    # The assistant's analysis message has no image_url of its own —
                    # the image was attached to the preceding user message in the same turn.
                    image_url = messages[i - 1].get("image_url")
                images.append({
                    "image_url": image_url,
                    "detected_objects": analysis_data["detected_objects"],
                    "morphology_context": analysis_data.get("morphology_context"),
                })
            if m.get("route") == "notebook" and m.get("citations"):
                notebook_citations.extend(m["citations"])
            if m.get("arxiv_papers"):
                arxiv_papers.extend(m["arxiv_papers"])

        topic_hint: str | None = None
        for img in images:
            for obj in img["detected_objects"]:
                if obj.get("confidence") == "high":
                    topic_hint = f"{obj.get('sub_type', '')} {obj.get('class_name', '')}".strip()
                    break
            if topic_hint:
                break
        if topic_hint is None and images and images[0]["detected_objects"]:
            obj = images[0]["detected_objects"][0]
            topic_hint = f"{obj.get('sub_type', '')} {obj.get('class_name', '')}".strip()

        language_hint: str | None = None
        for m in messages:
            if m.get("role") == "user" and (m.get("content") or "").strip():
                language_hint = m["content"].strip()
                break

        return SessionContext(
            images=images,
            notebook_citations=notebook_citations,
            arxiv_papers=arxiv_papers,
            topic_hint=topic_hint or None,
            has_data=bool(images or notebook_citations or arxiv_papers),
            language_hint=language_hint,
        )

    def _session_context_text(self, ctx: SessionContext) -> str:
        if not ctx.has_data:
            return ""
        parts: list[str] = []
        if ctx.images:
            names = ", ".join(
                f"{obj.get('sub_type', '')} {obj.get('class_name', '')}".strip()
                for img in ctx.images for obj in img["detected_objects"]
            )
            if names:
                parts.append(f"Người dùng đã phân tích ảnh các thiên thể: {names}.")
        if ctx.notebook_citations:
            docs = ", ".join(sorted({c["doc_name"] for c in ctx.notebook_citations if c.get("doc_name")}))
            if docs:
                parts.append(f"Người dùng đã tra cứu tài liệu: {docs}.")
        if ctx.arxiv_papers:
            titles = ", ".join(p["title"] for p in ctx.arxiv_papers[:3] if p.get("title"))
            if titles:
                parts.append(f"Người dùng đã xem các paper: {titles}.")
        return " ".join(parts)

    def _write_research_report(
        self, topic: str, keywords: list[str], web_context: list[dict], papers: list[dict],
        notebook_text: str = "", session_text: str = "",
    ) -> str:
        params = build_research_report_request(
            topic, keywords, web_context, papers, model=self.model,
            notebook_text=notebook_text, session_text=session_text,
        )
        return llm.call(params, api_key=self.api_key)

    def _write_trending_report(
        self, topic: str, keywords: list[str], web_context: list[dict], papers: list[dict],
        top_authors: list[dict] | None = None, notebook_text: str = "", session_text: str = "",
    ) -> str:
        params = build_trending_report_request(
            topic, keywords, web_context, papers, top_authors, model=self.model,
            notebook_text=notebook_text, session_text=session_text,
        )
        return llm.call(params, api_key=self.api_key)

    def _write_discovery_report(self, topic: str, ctx: SessionContext) -> str:
        context_parts: list[str] = []
        for img in ctx.images:
            objs = ", ".join(
                f"{o.get('sub_type', '')} {o.get('class_name', '')} "
                f"(độ tin cậy: {o.get('confidence', '')}): {o.get('description', '')}"
                for o in img["detected_objects"]
            )
            if objs:
                context_parts.append(f"Đối tượng đã phát hiện trong ảnh: {objs}")
            if img.get("morphology_context"):
                context_parts.append(f"Phân tích hình thái học: {img['morphology_context']}")
        if ctx.notebook_citations:
            cite_lines = [
                f"- {c.get('doc_name', '')}: {(c.get('excerpt') or '')[:300]}"
                for c in ctx.notebook_citations[:5]
            ]
            context_parts.append("Trích dẫn từ tài liệu Notebook của người dùng:\n" + "\n".join(cite_lines))
        if ctx.arxiv_papers:
            paper_lines = [f"- {p.get('title', '')}" for p in ctx.arxiv_papers[:5] if p.get("title")]
            if paper_lines:
                context_parts.append("Paper arXiv đã tìm thấy trong phiên:\n" + "\n".join(paper_lines))

        user_content = f"Chủ đề: {topic}"
        if ctx.language_hint:
            user_content += f'\nTin nhắn của người dùng: "{ctx.language_hint}"'
        if context_parts:
            user_content += "\n\n" + "\n\n".join(context_parts)

        return llm.complete(
            [
                {"role": "system", "content": _DISCOVERY_REPORT_SYSTEM},
                {"role": "user", "content": user_content},
            ],
            api_key=self.api_key,
            model=self.model,
            temperature=0.4,
        )

    def _collect_trending_data(
        self, keywords: list[str], prev_year: int, recent_year: int
    ) -> tuple[list[dict], str, dict, str]:
        from trends.report import (
            analyze_interest,
            analyze_trends,
            collect_topic_counts,
            format_interest,
            parse_series,
            parse_trends,
        )
        topic_rows: list[dict] = []
        topics_analysis = ""
        try:
            topic_rows = collect_topic_counts(keywords, prev_year, recent_year)
            if any(r["prev"] > 0 or r["recent"] > 0 for r in topic_rows):
                topics_analysis = analyze_trends(
                    topic_rows, prev_year, recent_year,
                    api_key=self.api_key, model=self.model,
                )
        except Exception:
            pass

        interest_series: dict = {}
        interest_text = ""
        if self.serpapi_api_key:
            try:
                from trends.googletrends import fetch_trends
                payload = fetch_trends(keywords[:5], self.serpapi_api_key)
                rows = parse_trends(payload)
                interest_series = parse_series(payload)
                if rows:
                    interest_text = analyze_interest(rows, api_key=self.api_key, model=self.model)
            except Exception:
                pass

        return topic_rows, topics_analysis, interest_series, interest_text

    def _generate_discovery_payload(
        self, topic: str, *, doc_ids: list[str] | None = None, conversation_id: str | None = None,
    ) -> dict:
        ctx = (
            self._collect_session_context(conversation_id)
            if conversation_id
            else SessionContext(images=[], notebook_citations=[], arxiv_papers=[], topic_hint=None, has_data=False)
        )

        if not ctx.has_data:
            fallback_topic = topic or "thiên văn học"
            return self._generate_payload(
                fallback_topic, report_type="research", doc_ids=doc_ids, conversation_id=conversation_id,
            )

        resolved_topic = topic or ctx.topic_hint or "Khám phá phiên làm việc"

        session_title = resolved_topic
        if self.store and self.user_id and conversation_id:
            conv = self.store.get_conversation(conversation_id, self.user_id)
            if conv:
                session_title = conv["title"]

        research_text = self._write_discovery_report(resolved_topic, ctx)
        notebook_citations = [Citation(**c) for c in ctx.notebook_citations]

        return {
            "report_type": "discovery",
            "research_text": research_text,
            "topics": {"rows": [], "analysis": ""},
            "timeline": {"rows": [], "by_method": {"years": [], "series": {}}, "analysis": ""},
            "interest": {"series": {}, "text": ""},
            "top_authors": [],
            "keywords": [resolved_topic],
            "discovery": {
                "session_title": session_title,
                "images": ctx.images,
            },
            "references": _build_references([], ctx.arxiv_papers, notebook_citations),
            "generated_at": datetime.now(UTC).isoformat(),
        }

    def _generate_payload(
        self, topic: str, *, report_type: str = "research",
        doc_ids: list[str] | None = None, conversation_id: str | None = None,
    ) -> dict:
        """Full computation: returns the final payload dict. No DB calls."""
        if report_type == "discovery":
            return self._generate_discovery_payload(topic, doc_ids=doc_ids, conversation_id=conversation_id)

        keywords = self._extract_keywords(topic)
        web_context = self._fetch_web_context(topic)
        papers = self._fetch_arxiv_papers(keywords)
        notebook_text, notebook_citations = self._fetch_notebook_context(topic, doc_ids)

        session_text = ""
        if conversation_id:
            session_text = self._session_context_text(self._collect_session_context(conversation_id))

        topic_rows: list[dict] = []
        topics_analysis = ""
        interest_series: dict = {}
        interest_text = ""
        top_authors: list[dict] = []

        if report_type == "trending":
            prev_year = datetime.now(UTC).year - 2
            recent_year = datetime.now(UTC).year - 1
            topic_rows, topics_analysis, interest_series, interest_text = (
                self._collect_trending_data(keywords, prev_year, recent_year)
            )
            top_authors = _compute_author_frequency(papers)
            research_text = self._write_trending_report(
                topic, keywords, web_context, papers, top_authors,
                notebook_text=notebook_text, session_text=session_text,
            )
        else:
            research_text = self._write_research_report(
                topic, keywords, web_context, papers,
                notebook_text=notebook_text, session_text=session_text,
            )

        return {
            "report_type": report_type,
            "research_text": research_text,
            "topics": {"rows": topic_rows, "analysis": topics_analysis},
            "timeline": {"rows": [], "by_method": {"years": [], "series": {}}, "analysis": ""},
            "interest": {"series": interest_series, "text": interest_text},
            "top_authors": top_authors,
            "keywords": keywords,
            "discovery": None,
            "references": _build_references(web_context, papers, notebook_citations),
            "generated_at": datetime.now(UTC).isoformat(),
        }

    def run_update(
        self, report_id: str, topic: str, *, report_type: str = "research",
        doc_ids: list[str] | None = None, conversation_id: str | None = None,
    ) -> None:
        """Generate payload and update an existing pending report record. Used by background task."""
        if not self.store:
            return
        try:
            payload = self._generate_payload(
                topic, report_type=report_type, doc_ids=doc_ids, conversation_id=conversation_id,
            )
        except Exception as exc:
            payload = {
                **_EMPTY_PAYLOAD,
                "report_type": report_type,
                "generating": False,
                "error": str(exc),
            }
        self.store.update_report(report_id, payload)

    def run(
        self, topic: str, *, report_type: str = "research", dry_run: bool = False,
        doc_ids: list[str] | None = None, conversation_id: str | None = None,
    ) -> tuple[str, str | None]:
        """Synchronous (blocking) report generation — for CLI use. Returns (summary, report_id)."""
        if not self.store or not self.user_id:
            return "Report agent không khả dụng (thiếu database).", None

        if dry_run:
            payload = {**_EMPTY_PAYLOAD, "generating": False, "research_text": f"[dry-run] Báo cáo về: {topic}"}
        else:
            payload = self._generate_payload(
                topic, report_type=report_type, doc_ids=doc_ids, conversation_id=conversation_id,
            )

        label = topic[:60].strip()
        title = f"Báo cáo: {label}"
        report_id = self.store.create_report(self.user_id, title, payload)

        kw_str = topic[:40]
        return f"Đã tạo báo cáo '{title}' (chủ đề: {kw_str}). Mở mục Reports để xem.", report_id
