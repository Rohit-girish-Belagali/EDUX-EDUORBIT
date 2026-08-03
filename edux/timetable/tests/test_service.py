from datetime import date, timedelta

import pytest

from edux.timetable.service import QUICK_EVENTS_PLAN_ID, TimetableService
from edux.timetable.storage import TimetableStore


@pytest.fixture
def service(tmp_path):
    return TimetableService(TimetableStore(root=tmp_path))


class TestQuickEvents:
    def test_creates_plan_and_day_on_first_add(self, service):
        today = date.today().isoformat()
        plan, item = service.add_quick_event(
            event_date=today,
            subject_name="Personal",
            activity="learn",
            topic_name="Renew passport",
            minutes=15,
        )
        assert plan.id == QUICK_EVENTS_PLAN_ID
        assert len(plan.days) == 1
        assert plan.days[0].date == today
        assert plan.days[0].items == [item]
        assert item.topic_name == "Renew passport"
        assert item.minutes == 15

    def test_reuses_plan_and_day_on_second_add(self, service):
        today = date.today().isoformat()
        service.add_quick_event(today, "Personal", "learn", "First", 10)
        plan, _item = service.add_quick_event(today, "Personal", "practice", "Second", 20)
        assert len(plan.days) == 1
        assert len(plan.days[0].items) == 2

    def test_distinct_subject_names_get_distinct_subject_ids(self, service):
        today = date.today().isoformat()
        plan, item1 = service.add_quick_event(today, "Work", "learn", "A", 10)
        plan, item2 = service.add_quick_event(today, "Personal", "learn", "B", 10)
        assert item1.subject_id != item2.subject_id
        assert {s.id for s in plan.subjects} == {item1.subject_id, item2.subject_id}

    def test_invalid_date_raises(self, service):
        with pytest.raises(ValueError):
            service.add_quick_event("not-a-date", "Personal", "learn", "X", 10)

    def test_explicit_time_is_stored_and_normalized(self, service):
        today = date.today().isoformat()
        _plan, item = service.add_quick_event(
            today, "Personal", "learn", "X", 10, time_of_day="9:5"
        )
        assert item.start_time == "09:05"

    def test_default_time_is_nine_am(self, service):
        today = date.today().isoformat()
        _plan, item = service.add_quick_event(today, "Personal", "learn", "X", 10)
        assert item.start_time == "09:00"

    def test_invalid_time_raises(self, service):
        today = date.today().isoformat()
        with pytest.raises(ValueError):
            service.add_quick_event(today, "Personal", "learn", "X", 10, time_of_day="25:00")

    def test_items_within_a_day_sorted_by_time(self, service):
        today = date.today().isoformat()
        service.add_quick_event(today, "Personal", "learn", "Later", 10, time_of_day="14:00")
        plan, _item = service.add_quick_event(
            today, "Personal", "learn", "Earlier", 10, time_of_day="08:00"
        )
        assert [it.topic_name for it in plan.days[0].items] == ["Earlier", "Later"]


class TestListUpcoming:
    def test_excludes_done_items(self, service):
        today = date.today().isoformat()
        plan, item = service.add_quick_event(today, "Personal", "learn", "Done thing", 10)
        service.toggle_item(plan.id, today, item.id, True)
        events = service.list_upcoming(7)
        assert events == []

    def test_respects_days_window(self, service):
        today = date.today()
        in_window = (today + timedelta(days=3)).isoformat()
        out_of_window = (today + timedelta(days=10)).isoformat()
        service.add_quick_event(in_window, "Personal", "learn", "In window", 10)
        service.add_quick_event(out_of_window, "Personal", "learn", "Out of window", 10)
        events = service.list_upcoming(7)
        topics = {e["item"]["topic_name"] for e in events}
        assert topics == {"In window"}

    def test_excludes_past_days(self, service):
        past = (date.today() - timedelta(days=1)).isoformat()
        service.add_quick_event(past, "Personal", "learn", "Past thing", 10)
        assert service.list_upcoming(7) == []

    def test_sorted_by_date_then_activity(self, service):
        today = date.today()
        d0 = today.isoformat()
        d1 = (today + timedelta(days=1)).isoformat()
        service.add_quick_event(d1, "Personal", "revision", "Later revision", 10)
        service.add_quick_event(d0, "Personal", "practice", "Today practice", 10)
        service.add_quick_event(d0, "Personal", "learn", "Today learn", 10)
        events = service.list_upcoming(7)
        ordered = [(e["day_date"], e["item"]["activity"]) for e in events]
        assert ordered == [(d0, "learn"), (d0, "practice"), (d1, "revision")]
