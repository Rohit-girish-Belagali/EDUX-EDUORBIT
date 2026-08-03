import pytest

from edux.timetable.models import (
    ActivityType,
    SyllabusChapter,
    SyllabusSubject,
    SyllabusTopic,
    TimetableConstraints,
)
from edux.timetable.scheduler import DIFFICULTY_LEARN_MINUTES, build_schedule


def _subject(
    subject_id: str,
    n_topics: int,
    *,
    weight: int = 2,
    difficulty: int = 1,
    include: bool = True,
) -> SyllabusSubject:
    topics = [
        SyllabusTopic(id=f"{subject_id}_t{i}", name=f"Topic {i}", order=i, difficulty=difficulty)
        for i in range(n_topics)
    ]
    return SyllabusSubject(
        id=subject_id,
        name=subject_id,
        order=0,
        include=include,
        weight=weight,
        chapters=[SyllabusChapter(id=f"{subject_id}_c0", name="Chapter 1", order=0, topics=topics)],
    )


def _constraints(**overrides) -> TimetableConstraints:
    base = dict(
        start_date="2026-08-03",  # a Monday
        weeks=1,
        daily_minutes={str(i): 60 for i in range(7)},
        learn_ratio=0.5,
        practice_ratio=0.3,
        revision_ratio=0.2,
    )
    base.update(overrides)
    return TimetableConstraints(**base)


class TestBudgets:
    def test_off_days_get_no_items(self):
        subjects = [_subject("s1", 20)]
        constraints = _constraints(daily_minutes={**{str(i): 60 for i in range(5)}, "5": 0, "6": 0})
        days, _ = build_schedule(subjects, constraints)
        weekend = [d for d in days if d.weekday in (5, 6)]
        assert weekend and all(not d.items for d in weekend)

    def test_zero_budget_plan_schedules_nothing(self):
        subjects = [_subject("s1", 3)]
        constraints = _constraints(daily_minutes={str(i): 0 for i in range(7)})
        days, unscheduled = build_schedule(subjects, constraints)
        assert all(not d.items for d in days)
        assert unscheduled == 3

    def test_excluded_subject_is_ignored(self):
        subjects = [_subject("s1", 3, include=False)]
        days, unscheduled = build_schedule(subjects, _constraints())
        assert all(not d.items for d in days)
        assert unscheduled == 0


class TestAllocation:
    def test_all_topics_scheduled_given_enough_time(self):
        subjects = [_subject("s1", 5, difficulty=1)]
        constraints = _constraints(weeks=4)
        days, unscheduled = build_schedule(subjects, constraints)
        assert unscheduled == 0
        learn_topics = {
            it.topic_name
            for d in days
            for it in d.items
            if it.activity == ActivityType.LEARN
        }
        assert len(learn_topics) == 5

    def test_unscheduled_topics_counted_when_plan_too_short(self):
        subjects = [_subject("s1", 50, difficulty=3)]
        constraints = _constraints(weeks=1, daily_minutes={str(i): 30 for i in range(7)})
        _, unscheduled = build_schedule(subjects, constraints)
        assert unscheduled > 0

    def test_revision_only_appears_after_topics_are_covered(self):
        subjects = [_subject("s1", 10, difficulty=1)]
        constraints = _constraints(weeks=2)
        days, _ = build_schedule(subjects, constraints)
        for i, day in enumerate(days):
            revised_topics = {it.topic_name for it in day.items if it.activity == ActivityType.REVISION}
            if not revised_topics:
                continue
            learned_before = {
                it.topic_name
                for prior in days[:i]
                for it in prior.items
                if it.activity == ActivityType.LEARN
            }
            assert revised_topics <= learned_before

    def test_higher_weight_subject_gets_more_early_slots(self):
        subjects = [_subject("heavy", 8, weight=3), _subject("light", 8, weight=1)]
        constraints = _constraints(weeks=3, daily_minutes={str(i): 40 for i in range(7)})
        days, _ = build_schedule(subjects, constraints)
        first_five_days_learns = [
            it.subject_id
            for d in days[:5]
            for it in d.items
            if it.activity == ActivityType.LEARN
        ]
        assert first_five_days_learns.count("heavy") > first_five_days_learns.count("light")

    def test_no_item_exceeds_the_difficulty_minute_table(self):
        subjects = [_subject("s1", 6, difficulty=3)]
        days, _ = build_schedule(subjects, _constraints(weeks=3))
        for d in days:
            for it in d.items:
                if it.activity == ActivityType.LEARN:
                    assert it.minutes == DIFFICULTY_LEARN_MINUTES[3]


class TestEdgeCases:
    def test_no_included_subjects_returns_empty(self):
        days, unscheduled = build_schedule([], _constraints())
        assert days == []
        assert unscheduled == 0

    def test_invalid_start_date_falls_back_without_raising(self):
        subjects = [_subject("s1", 2)]
        constraints = _constraints(start_date="not-a-date")
        days, _ = build_schedule(subjects, constraints)
        assert len(days) == 7


def _to_minutes(hhmm: str) -> int:
    hh, mm = hhmm.split(":")
    return int(hh) * 60 + int(mm)


class TestStartTimes:
    def test_items_start_back_to_back_from_day_start_time(self):
        subjects = [_subject("s1", 6, difficulty=1)]
        constraints = _constraints(weeks=2, day_start_time="08:30")
        days, _ = build_schedule(subjects, constraints)
        for day in days:
            if not day.items:
                continue
            expected_clock = _to_minutes("08:30")
            for item in day.items:
                assert item.start_time == f"{expected_clock // 60:02d}:{expected_clock % 60:02d}"
                expected_clock += item.minutes

    def test_start_times_strictly_non_decreasing_within_a_day(self):
        subjects = [_subject("s1", 10, difficulty=2)]
        days, _ = build_schedule(subjects, _constraints(weeks=2))
        for day in days:
            clocks = [_to_minutes(it.start_time) for it in day.items]
            assert clocks == sorted(clocks)

    def test_default_day_start_time_is_nine_am(self):
        subjects = [_subject("s1", 1, difficulty=1)]
        days, _ = build_schedule(subjects, _constraints(weeks=1))
        first_item_day = next(d for d in days if d.items)
        assert first_item_day.items[0].start_time == "09:00"
