"""Timetable Planner API Router."""

from __future__ import annotations

from typing import Literal
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from edux.services.settings.interface_settings import get_ui_language
from edux.timetable import prompts as timetable_prompts
from edux.timetable.models import (
    SyllabusChapter,
    SyllabusSubject,
    SyllabusTopic,
    TimetableConstraints,
    TimetablePlan,
)
from edux.timetable.scheduler import build_schedule
from edux.timetable.service import TimetableService
from edux.timetable.storage import TimetableStore
from edux.utils.document_extractor import DocumentExtractionError, extract_text_from_bytes
from edux.utils.json_parser import parse_json_response

router = APIRouter()

_MAX_SUBJECTS = 12
_MAX_CHAPTERS_PER_SUBJECT = 40
_MAX_TOPICS_TOTAL = 300
_ALLOWED_DIFFICULTY = {1, 2, 3}


def get_timetable_service() -> TimetableService:
    # Create a fresh store + service per request to avoid object-level race conditions.
    return TimetableService(TimetableStore())


def _validate_plan_id(plan_id: str) -> None:
    if not plan_id or ".." in plan_id or "/" in plan_id or "\\" in plan_id or ":" in plan_id:
        raise HTTPException(status_code=400, detail="Invalid plan_id")


# ── Request models ───────────────────────────────────────────────────────────


class TopicIn(BaseModel):
    name: str
    difficulty: int = 2


class ChapterIn(BaseModel):
    name: str
    topics: list[TopicIn] = Field(default_factory=list)


class SubjectIn(BaseModel):
    name: str
    include: bool = True
    weight: int = 2
    chapters: list[ChapterIn] = Field(default_factory=list)


class GeneratePlanRequest(BaseModel):
    name: str
    subjects: list[SubjectIn]
    constraints: TimetableConstraints


class ToggleItemRequest(BaseModel):
    day_date: str
    done: bool


class QuickEventRequest(BaseModel):
    title: str
    date: str
    subject_name: str = "Personal"
    activity: Literal["learn", "practice", "revision"] = "learn"
    minutes: int = 30
    time: str = "09:00"


# ── Helpers ──────────────────────────────────────────────────────────────────


def _subjects_from_input(raw_subjects: list[SubjectIn]) -> list[SyllabusSubject]:
    """Assign server-side ids and clamp sizes/values (shared by extract + generate)."""
    subjects: list[SyllabusSubject] = []
    topic_total = 0
    for i, subj in enumerate(raw_subjects[:_MAX_SUBJECTS]):
        subject_id = f"subj{i}_{uuid.uuid4().hex[:8]}"
        chapters: list[SyllabusChapter] = []
        for j, chap in enumerate(subj.chapters[:_MAX_CHAPTERS_PER_SUBJECT]):
            topics: list[SyllabusTopic] = []
            for k, topic in enumerate(chap.topics):
                if topic_total >= _MAX_TOPICS_TOTAL:
                    break
                name = topic.name.strip()[:200]
                if not name:
                    continue
                difficulty = topic.difficulty if topic.difficulty in _ALLOWED_DIFFICULTY else 2
                topics.append(
                    SyllabusTopic(id=f"{subject_id}_c{j}_t{k}", name=name, order=k, difficulty=difficulty)
                )
                topic_total += 1
            if not topics:
                continue
            chapters.append(
                SyllabusChapter(id=f"{subject_id}_c{j}", name=chap.name.strip()[:200] or f"Chapter {j + 1}", order=j, topics=topics)
            )
        subjects.append(
            SyllabusSubject(
                id=subject_id,
                name=subj.name.strip()[:200] or f"Subject {i + 1}",
                order=i,
                include=subj.include,
                weight=subj.weight if subj.weight in (1, 2, 3) else 2,
                chapters=chapters,
            )
        )
    return subjects


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/extract-syllabus")
async def extract_syllabus(file: UploadFile = File(...)):
    """Extract raw text from an uploaded syllabus and structure it into a
    subject/chapter/topic tree via one LLM call. Returns the structure for the
    user to review/edit before a plan is generated — nothing is persisted here."""
    data = await file.read()
    try:
        text = extract_text_from_bytes(file.filename or "syllabus", data)
    except DocumentExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    from edux.services.llm import complete

    language = get_ui_language()
    system_prompt, prompt = timetable_prompts.syllabus_extraction_prompts(language, text)
    response = await complete(prompt=prompt, system_prompt=system_prompt)
    data_json = parse_json_response(response, fallback=None)
    if not isinstance(data_json, dict):
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")

    subjects_raw = data_json.get("subjects", [])
    if not isinstance(subjects_raw, list) or not subjects_raw:
        raise HTTPException(
            status_code=502, detail="LLM returned invalid structure: subjects is empty or not a list"
        )

    parsed: list[SubjectIn] = []
    for s in subjects_raw:
        if not isinstance(s, dict) or not s.get("name"):
            continue
        chapters: list[ChapterIn] = []
        for c in s.get("chapters", []):
            if not isinstance(c, dict) or not c.get("name"):
                continue
            topics = [
                TopicIn(name=str(t["name"]), difficulty=int(t.get("difficulty", 2)))
                for t in c.get("topics", [])
                if isinstance(t, dict) and t.get("name")
            ]
            chapters.append(ChapterIn(name=str(c["name"]), topics=topics))
        parsed.append(SubjectIn(name=str(s["name"]), chapters=chapters))

    subjects = _subjects_from_input(parsed)
    return {"subjects": [s.model_dump(mode="json") for s in subjects]}


@router.post("/plans/generate")
async def generate_plan(body: GeneratePlanRequest):
    ratio_sum = body.constraints.learn_ratio + body.constraints.practice_ratio + body.constraints.revision_ratio
    if not (0.9 <= ratio_sum <= 1.1):
        raise HTTPException(status_code=400, detail="learn/practice/revision ratios must sum to ~1.0")
    if body.constraints.weeks <= 0:
        raise HTTPException(status_code=400, detail="weeks must be positive")

    subjects = _subjects_from_input(body.subjects)
    if not any(s.include and s.chapters for s in subjects):
        raise HTTPException(status_code=400, detail="At least one included subject with topics is required")

    days, unscheduled = build_schedule(subjects, body.constraints)
    plan = TimetablePlan(
        id=uuid.uuid4().hex,
        name=body.name.strip()[:200] or "Study Plan",
        subjects=subjects,
        constraints=body.constraints,
        days=days,
        unscheduled_topics=unscheduled,
    )
    service = get_timetable_service()
    service.save(plan)
    return plan.model_dump(mode="json")


@router.get("/plans")
async def list_plans():
    service = get_timetable_service()
    return {"plans": service.list_all()}


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    _validate_plan_id(plan_id)
    service = get_timetable_service()
    plan = service.get(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Timetable plan not found")
    return plan.model_dump(mode="json")


@router.patch("/plans/{plan_id}/items/{item_id}")
async def toggle_item(plan_id: str, item_id: str, body: ToggleItemRequest):
    _validate_plan_id(plan_id)
    service = get_timetable_service()
    try:
        plan = service.toggle_item(plan_id, body.day_date, item_id, body.done)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return plan.model_dump(mode="json")


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str):
    _validate_plan_id(plan_id)
    service = get_timetable_service()
    if service.get(plan_id) is None:
        raise HTTPException(status_code=404, detail="Timetable plan not found")
    service.delete(plan_id)
    return {"status": "ok"}


@router.get("/upcoming")
async def list_upcoming(days: int = 7):
    service = get_timetable_service()
    return {"events": service.list_upcoming(days)}


@router.post("/quick-events")
async def add_quick_event(body: QuickEventRequest):
    service = get_timetable_service()
    try:
        plan, item = service.add_quick_event(
            event_date=body.date,
            subject_name=body.subject_name,
            activity=body.activity,
            topic_name=body.title,
            minutes=body.minutes,
            time_of_day=body.time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"plan_id": plan.id, "item": item.model_dump(mode="json")}
