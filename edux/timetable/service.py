from __future__ import annotations

from datetime import date, timedelta
import re
from typing import Any
import uuid

from edux.timetable.models import (
    ActivityType,
    SyllabusSubject,
    TimetableConstraints,
    TimetableDay,
    TimetableItem,
    TimetablePlan,
)
from edux.timetable.storage import TimetableStore

# A reserved, deterministic-id plan that ad-hoc "quick add" events live in —
# just a normal TimetablePlan the syllabus wizard never touches, so it shows
# up in the regular plan list/detail views for free.
QUICK_EVENTS_PLAN_ID = "quick-events"

_ACTIVITY_ORDER = {"learn": 0, "practice": 1, "revision": 2}


def _slug(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")
    return slug or "personal"


def _validate_hhmm(text: str) -> str:
    """Raise ValueError for anything that isn't a plausible 24h "HH:MM"."""
    hh, _, mm = text.partition(":")
    if not (hh.isdigit() and mm.isdigit() and 0 <= int(hh) <= 23 and 0 <= int(mm) <= 59):
        raise ValueError(f"Invalid time: {text!r}")
    return f"{int(hh):02d}:{int(mm):02d}"


class TimetableService:
    def __init__(self, store: TimetableStore) -> None:
        self._store = store

    def get(self, plan_id: str) -> TimetablePlan | None:
        return self._store.load(plan_id)

    def save(self, plan: TimetablePlan) -> None:
        self._store.save(plan)

    def delete(self, plan_id: str) -> None:
        self._store.delete(plan_id)

    def list_all(self) -> list[dict[str, Any]]:
        summaries: list[dict[str, Any]] = []
        for plan_id in self._store.list_all():
            plan = self._store.load(plan_id)
            if plan is None:
                continue
            total_items = sum(len(day.items) for day in plan.days)
            done_items = sum(1 for day in plan.days for item in day.items if item.done)
            summaries.append(
                {
                    "id": plan.id,
                    "name": plan.name,
                    "start_date": plan.constraints.start_date,
                    "weeks": plan.constraints.weeks,
                    "total_items": total_items,
                    "done_items": done_items,
                    "unscheduled_topics": plan.unscheduled_topics,
                    "updated_at": plan.updated_at,
                }
            )
        summaries.sort(key=lambda s: s["updated_at"], reverse=True)
        return summaries

    def toggle_item(self, plan_id: str, day_date: str, item_id: str, done: bool) -> TimetablePlan:
        plan = self._store.load(plan_id)
        if plan is None:
            raise ValueError(f"Timetable plan not found: {plan_id!r}")
        for day in plan.days:
            if day.date != day_date:
                continue
            for item in day.items:
                if item.id == item_id:
                    item.done = done
                    self._store.save(plan)
                    return plan
        raise ValueError(f"Timetable item not found: {item_id!r} on {day_date!r}")

    def get_or_create_quick_events_plan(self) -> TimetablePlan:
        plan = self._store.load(QUICK_EVENTS_PLAN_ID)
        if plan is not None:
            return plan
        plan = TimetablePlan(
            id=QUICK_EVENTS_PLAN_ID,
            name="Quick Events",
            subjects=[],
            constraints=TimetableConstraints(
                start_date=date.today().isoformat(), weeks=0, daily_minutes={}
            ),
            days=[],
        )
        self._store.save(plan)
        return plan

    def add_quick_event(
        self,
        event_date: str,
        subject_name: str,
        activity: str,
        topic_name: str,
        minutes: int,
        time_of_day: str = "09:00",
    ) -> tuple[TimetablePlan, TimetableItem]:
        # Validate the date/time up front so a malformed value fails clearly
        # rather than silently sorting wrong later.
        parsed_date = date.fromisoformat(event_date)
        time_of_day = _validate_hhmm(time_of_day)

        plan = self.get_or_create_quick_events_plan()

        subject_name = subject_name.strip()[:200] or "Personal"
        subject_id = "quick_" + _slug(subject_name)
        if not any(s.id == subject_id for s in plan.subjects):
            plan.subjects.append(
                SyllabusSubject(
                    id=subject_id,
                    name=subject_name,
                    order=len(plan.subjects),
                    include=True,
                    weight=2,
                    chapters=[],
                )
            )

        day = next((d for d in plan.days if d.date == event_date), None)
        if day is None:
            day = TimetableDay(date=event_date, weekday=parsed_date.weekday(), items=[])
            plan.days.append(day)
            plan.days.sort(key=lambda d: d.date)

        item = TimetableItem(
            id=uuid.uuid4().hex[:12],
            subject_id=subject_id,
            subject_name=subject_name,
            chapter_name="Quick Events",
            topic_name=topic_name.strip()[:200] or "Untitled",
            activity=ActivityType(activity),
            minutes=max(1, minutes),
            start_time=time_of_day,
        )
        day.items.append(item)
        day.items.sort(key=lambda it: it.start_time)
        self._store.save(plan)
        return plan, item

    def list_upcoming(self, days: int = 7) -> list[dict[str, Any]]:
        today = date.today()
        end = today + timedelta(days=max(0, days))
        results: list[dict[str, Any]] = []
        for plan_id in self._store.list_all():
            plan = self._store.load(plan_id)
            if plan is None:
                continue
            for day in plan.days:
                try:
                    day_date = date.fromisoformat(day.date)
                except ValueError:
                    continue
                if not (today <= day_date <= end):
                    continue
                for item in day.items:
                    if item.done:
                        continue
                    results.append(
                        {
                            "plan_id": plan.id,
                            "plan_name": plan.name,
                            "day_date": day.date,
                            "item": item.model_dump(mode="json"),
                        }
                    )
        results.sort(
            key=lambda r: (r["day_date"], _ACTIVITY_ORDER.get(r["item"]["activity"], 9))
        )
        return results[:50]


__all__ = ["TimetableService", "QUICK_EVENTS_PLAN_ID"]
