"""Deterministic day-by-day scheduling — no I/O, no LLM.

Turns a syllabus tree (subjects -> chapters -> topics) plus a set of time
constraints into a calendar of :class:`TimetableDay` objects. See
``edux/timetable/models.py`` for the shapes involved.
"""

from __future__ import annotations

from datetime import date, timedelta
import uuid

from edux.timetable.models import (
    ActivityType,
    SyllabusSubject,
    TimetableConstraints,
    TimetableDay,
    TimetableItem,
)

# Base "learn" minutes per topic by difficulty (1 = easy, 3 = hard).
DIFFICULTY_LEARN_MINUTES = {1: 20, 2: 35, 3: 50}
REVISION_ITEM_MINUTES = 15
# A topic can resurface for revision at most this many times across the plan.
MAX_REVISIONS_PER_TOPIC = 3


class _Unit:
    """One topic in flight through the scheduler."""

    __slots__ = (
        "subject_id",
        "subject_name",
        "chapter_name",
        "topic_name",
        "learn_minutes",
        "practice_minutes",
        "revisions_used",
    )

    def __init__(
        self,
        subject_id: str,
        subject_name: str,
        chapter_name: str,
        topic_name: str,
        learn_minutes: int,
        practice_minutes: int,
    ) -> None:
        self.subject_id = subject_id
        self.subject_name = subject_name
        self.chapter_name = chapter_name
        self.topic_name = topic_name
        self.learn_minutes = learn_minutes
        self.practice_minutes = practice_minutes
        self.revisions_used = 0


def _parse_hhmm(text: str) -> int:
    """Parse "HH:MM" into minutes-since-midnight; falls back to 09:00 for
    anything malformed rather than raising mid-schedule."""
    try:
        hh, mm = text.split(":")
        return max(0, min(23, int(hh))) * 60 + max(0, min(59, int(mm)))
    except (ValueError, AttributeError):
        return 9 * 60


def _format_hhmm(minutes: int) -> str:
    minutes %= 24 * 60
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _stamp_start_times(day: TimetableDay, start_minutes: int) -> None:
    """Lay a day's already-placed items back-to-back from ``start_minutes``,
    in the order they were appended — that order already reflects true
    placement order (practice flush, then learn/practice, then revision)."""
    clock = start_minutes
    for item in day.items:
        item.start_time = _format_hhmm(clock)
        clock += item.minutes


def _make_item(unit: _Unit, activity: ActivityType, minutes: int) -> TimetableItem:
    return TimetableItem(
        id=uuid.uuid4().hex[:12],
        subject_id=unit.subject_id,
        subject_name=unit.subject_name,
        chapter_name=unit.chapter_name,
        topic_name=unit.topic_name,
        activity=activity,
        minutes=minutes,
    )


def _build_queues(
    subjects: list[SyllabusSubject], learn_ratio: float, practice_ratio: float
) -> dict[str, list[_Unit]]:
    queues: dict[str, list[_Unit]] = {}
    for subject in sorted((s for s in subjects if s.include), key=lambda s: s.order):
        units: list[_Unit] = []
        for chapter in sorted(subject.chapters, key=lambda c: c.order):
            for topic in sorted(chapter.topics, key=lambda t: t.order):
                difficulty = topic.difficulty if topic.difficulty in DIFFICULTY_LEARN_MINUTES else 2
                learn_minutes = DIFFICULTY_LEARN_MINUTES[difficulty]
                practice_minutes = (
                    round(learn_minutes * practice_ratio / learn_ratio)
                    if learn_ratio > 0 and practice_ratio > 0
                    else 0
                )
                units.append(
                    _Unit(
                        subject.id,
                        subject.name,
                        chapter.name,
                        topic.name,
                        learn_minutes,
                        practice_minutes,
                    )
                )
        if units:
            queues[subject.id] = units
    return queues


class _WeightedRoundRobin:
    """Smooth weighted round-robin: higher-weight subjects come up more often
    without clustering all their picks together (surplus/credit scheduling,
    the same technique load balancers use for weighted backends)."""

    def __init__(self, subjects: list[SyllabusSubject], queues: dict[str, list[_Unit]]) -> None:
        self._weight = {s.id: max(1, s.weight) for s in subjects if s.id in queues}
        self._credit = dict.fromkeys(self._weight, 0)
        self._queues = queues

    def pick(self) -> str | None:
        candidates = [sid for sid in self._weight if self._queues.get(sid)]
        if not candidates:
            return None
        total_weight = sum(self._weight[sid] for sid in candidates)
        for sid in candidates:
            self._credit[sid] += self._weight[sid]
        best = max(candidates, key=lambda sid: self._credit[sid])
        self._credit[best] -= total_weight
        return best


def _allocate_revision(
    day: TimetableDay,
    revision_queue: list[tuple[_Unit, int]],
    day_index: int,
    budget: int,
) -> list[tuple[_Unit, int]]:
    if budget <= 0 or not revision_queue:
        return revision_queue

    remaining = budget
    carried: list[tuple[_Unit, int]] = []
    requeued: list[tuple[_Unit, int]] = []
    i = 0
    while i < len(revision_queue):
        unit, added_day = revision_queue[i]
        if remaining <= 0 or added_day >= day_index:
            # Not eligible today (added earlier-this-cycle or budget spent) —
            # keep it in place for a later day.
            carried.append((unit, added_day))
            i += 1
            continue
        minutes = min(REVISION_ITEM_MINUTES, remaining)
        day.items.append(_make_item(unit, ActivityType.REVISION, minutes))
        remaining -= minutes
        unit.revisions_used += 1
        if unit.revisions_used < MAX_REVISIONS_PER_TOPIC:
            requeued.append((unit, day_index))
        i += 1

    carried.extend(requeued)
    return carried


def build_schedule(
    subjects: list[SyllabusSubject], constraints: TimetableConstraints
) -> tuple[list[TimetableDay], int]:
    """Return (days, unscheduled_topic_count)."""

    learn_ratio = constraints.learn_ratio
    practice_ratio = constraints.practice_ratio
    revision_ratio = constraints.revision_ratio

    queues = _build_queues(subjects, learn_ratio, practice_ratio)
    if not queues:
        return [], 0

    round_robin = _WeightedRoundRobin(
        [s for s in subjects if s.include], queues
    )
    day_start_minutes = _parse_hhmm(constraints.day_start_time)

    try:
        start = date.fromisoformat(constraints.start_date)
    except ValueError:
        start = date.today()

    days: list[TimetableDay] = []
    revision_queue: list[tuple[_Unit, int]] = []
    practice_pending: list[_Unit] = []
    seen_study_day = False

    total_days = max(0, constraints.weeks) * 7
    for day_index in range(total_days):
        current_date = start + timedelta(days=day_index)
        weekday = current_date.weekday()
        budget = max(0, constraints.daily_minutes.get(str(weekday), 0))
        day = TimetableDay(date=current_date.isoformat(), weekday=weekday, items=[])

        if budget <= 0:
            days.append(day)
            continue

        is_first_study_day = not seen_study_day
        seen_study_day = True

        new_budget = int(round(budget * (learn_ratio + practice_ratio)))
        revision_budget = 0 if is_first_study_day else int(round(budget * revision_ratio))

        remaining_new = new_budget

        # Flush practice deferred from a previous day before pulling new topics.
        while remaining_new > 0 and practice_pending:
            unit = practice_pending.pop(0)
            day.items.append(_make_item(unit, ActivityType.PRACTICE, unit.practice_minutes))
            remaining_new -= unit.practice_minutes
            revision_queue.append((unit, day_index))

        while remaining_new > 0:
            sid = round_robin.pick()
            if sid is None:
                break
            unit = queues[sid].pop(0)
            day.items.append(_make_item(unit, ActivityType.LEARN, unit.learn_minutes))
            remaining_new -= unit.learn_minutes

            if unit.practice_minutes <= 0:
                revision_queue.append((unit, day_index))
            elif remaining_new > 0:
                day.items.append(_make_item(unit, ActivityType.PRACTICE, unit.practice_minutes))
                remaining_new -= unit.practice_minutes
                revision_queue.append((unit, day_index))
            else:
                practice_pending.append(unit)

        revision_queue = _allocate_revision(day, revision_queue, day_index, revision_budget)
        _stamp_start_times(day, day_start_minutes)
        days.append(day)

    unscheduled_topics = sum(len(q) for q in queues.values())
    return days, unscheduled_topics


__all__ = ["build_schedule", "DIFFICULTY_LEARN_MINUTES", "REVISION_ITEM_MINUTES"]
