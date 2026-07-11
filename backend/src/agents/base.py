import json
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class ThinkingEvent:
    preview: str
    type: str = field(default="thinking", init=False)

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "preview": self.preview})


@dataclass
class ActionEvent:
    tool: str
    args: dict = field(default_factory=dict)
    type: str = field(default="action", init=False)

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "tool": self.tool, "args": self.args})


@dataclass
class ObserveEvent:
    summary: str
    type: str = field(default="observe", init=False)

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "summary": self.summary})


@dataclass
class TextDeltaEvent:
    delta: str
    type: str = field(default="text_delta", init=False)

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "delta": self.delta})


@dataclass
class DoneEvent:
    route: str
    citations: list = field(default_factory=list)
    arxiv_papers: list = field(default_factory=list)
    web_sources: list = field(default_factory=list)
    report_id: str | None = None
    analysis_data: dict | None = None
    suggested_action: dict | None = None
    type: str = field(default="done", init=False)

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "route": self.route,
            "citations": self.citations,
            "arxiv_papers": self.arxiv_papers,
            "web_sources": self.web_sources,
            "report_id": self.report_id,
            "analysis_data": self.analysis_data,
            "suggested_action": self.suggested_action,
        })


@dataclass
class ErrorEvent:
    message: str
    type: str = field(default="error", init=False)

    def to_json(self) -> str:
        return json.dumps({"type": self.type, "message": self.message})


AgentEvent = ThinkingEvent | ActionEvent | ObserveEvent | TextDeltaEvent | DoneEvent | ErrorEvent


async def collect_events(gen: AsyncIterator[AgentEvent]) -> list[AgentEvent]:
    """Drain an async generator into a list. Used in tests."""
    return [ev async for ev in gen]
