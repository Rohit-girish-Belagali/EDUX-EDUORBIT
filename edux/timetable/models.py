from __future__ import annotations

from enum import Enum
import time

from pydantic import BaseModel, ConfigDict, Field


class ActivityType(str, Enum):
    LEARN = "learn"
    PRACTICE = "practice"
    REVISION = "revision"


class SyllabusTopic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    order: int
    difficulty: int = 2


class SyllabusChapter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    order: int
    topics: list[SyllabusTopic] = Field(default_factory=list)


class SyllabusSubject(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    order: int
    include: bool = True
    weight: int = 2
    chapters: list[SyllabusChapter] = Field(default_factory=list)


class TimetableConstraints(BaseModel):
    model_config = ConfigDict(extra="ignore")

    start_date: str
    weeks: int
    # Keys are weekday indices as strings, "0" (Monday) .. "6" (Sunday).
    daily_minutes: dict[str, int] = Field(default_factory=dict)
    learn_ratio: float = 0.5
    practice_ratio: float = 0.3
    revision_ratio: float = 0.2
    # 24h "HH:MM" clock time the scheduler starts stacking each day's items
    # from — lets the calendar views show real times, not just durations.
    day_start_time: str = "09:00"


class TimetableItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    subject_id: str
    subject_name: str
    chapter_name: str
    topic_name: str
    activity: ActivityType
    minutes: int
    done: bool = False
    # 24h "HH:MM" clock time; "" means unscheduled (e.g. legacy data from
    # before this field existed).
    start_time: str = ""


class TimetableDay(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date: str
    weekday: int
    items: list[TimetableItem] = Field(default_factory=list)


class TimetablePlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    subjects: list[SyllabusSubject] = Field(default_factory=list)
    constraints: TimetableConstraints
    days: list[TimetableDay] = Field(default_factory=list)
    unscheduled_topics: int = 0
    version: int = 0
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)


__all__ = [
    "ActivityType",
    "SyllabusTopic",
    "SyllabusChapter",
    "SyllabusSubject",
    "TimetableConstraints",
    "TimetableItem",
    "TimetableDay",
    "TimetablePlan",
]
