from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.db.models import ProgressTestTypeEnum


class ProfileOut(BaseModel):
    id: int
    user_id: int
    date_of_birth: date | None
    country: str
    native_language: str
    target_band_score: Decimal


class ProfilePatchIn(BaseModel):
    date_of_birth: date | None = None
    country: str | None = None
    native_language: str | None = None
    target_band_score: Decimal | None = None


class ProgressIn(BaseModel):
    band_score: Decimal
    correct_answers: int | None = None
    total_questions: int | None = None
    time_taken_seconds: int | None = None
    test_type: ProgressTestTypeEnum


class ProgressOut(BaseModel):
    id: int
    test_date: datetime
    band_score: Decimal
    correct_answers: int | None
    total_questions: int | None
    time_taken_seconds: int | None
    test_type: ProgressTestTypeEnum


class AnalyticsOut(BaseModel):
    total_tests_taken: int
    average_band_score: Decimal
    best_band_score: Decimal
    total_study_time_seconds: int
    last_test_date: datetime | None


class DashboardActivityDayOut(BaseModel):
    date: date
    attempts: int
    total_seconds: int
    total_minutes: int
    intensity: int


class DashboardActivitySummaryOut(BaseModel):
    practice_days: int
    total_attempts: int
    total_minutes: int


class DashboardActivitySettingsOut(BaseModel):
    year: int
    available_years: list[int]
    available_modules: list[ProgressTestTypeEnum]
    selected_modules: list[ProgressTestTypeEnum]


class DashboardActivityOut(BaseModel):
    year: int
    settings: DashboardActivitySettingsOut
    summary: DashboardActivitySummaryOut
    days: list[DashboardActivityDayOut]


class DashboardStatsOut(BaseModel):
    predicted_overall_band: Decimal
    total_attempts: int
    minutes_this_week: int
    current_streak: int


class DashboardAttemptOut(BaseModel):
    id: int
    title: str
    test_date: datetime
    test_type: ProgressTestTypeEnum
    band_score: Decimal
    time_taken_seconds: int | None


class DashboardQuickLinkOut(BaseModel):
    label: str
    path: str
    module: ProgressTestTypeEnum | None = None


class DashboardQuickLinksOut(BaseModel):
    items: list[DashboardQuickLinkOut]
