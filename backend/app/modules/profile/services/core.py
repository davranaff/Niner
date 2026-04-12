from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import OffsetPage, serialize_page
from app.db.models import ProgressTestTypeEnum, User, UserAnalytics, UserProfile, UserProgress
from app.modules.profile import repository
from app.modules.profile.schemas import (
    AnalyticsOut,
    DashboardActivityDayOut,
    DashboardActivityOut,
    DashboardActivitySettingsOut,
    DashboardActivitySummaryOut,
    DashboardAttemptOut,
    DashboardQuickLinkOut,
    DashboardQuickLinksOut,
    DashboardStatsOut,
    ProfileOut,
    ProgressOut,
)

ALL_ACTIVITY_MODULES: list[ProgressTestTypeEnum] = [
    ProgressTestTypeEnum.reading,
    ProgressTestTypeEnum.listening,
    ProgressTestTypeEnum.speaking,
    ProgressTestTypeEnum.writing,
]

ATTEMPT_TITLE_BY_TYPE: dict[ProgressTestTypeEnum, str] = {
    ProgressTestTypeEnum.reading: "Academic Reading Mock",
    ProgressTestTypeEnum.listening: "Listening Mock",
    ProgressTestTypeEnum.writing: "Writing Mock",
    ProgressTestTypeEnum.speaking: "Speaking Mock",
}


def _profile_out(profile: UserProfile) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        date_of_birth=profile.date_of_birth,
        country=profile.country,
        native_language=profile.native_language,
        target_band_score=profile.target_band_score,
    )


def _progress_out(row: UserProgress) -> ProgressOut:
    return ProgressOut(
        id=row.id,
        test_date=row.test_date,
        band_score=row.band_score,
        correct_answers=row.correct_answers,
        total_questions=row.total_questions,
        time_taken_seconds=row.time_taken_seconds,
        test_type=row.test_type,
    )


def _analytics_out(row: UserAnalytics) -> AnalyticsOut:
    return AnalyticsOut(
        total_tests_taken=row.total_tests_taken,
        average_band_score=row.average_band_score,
        best_band_score=row.best_band_score,
        total_study_time_seconds=row.total_study_time_seconds,
        last_test_date=row.last_test_date,
    )


def _dashboard_attempt_out(row: UserProgress) -> DashboardAttemptOut:
    title_base = ATTEMPT_TITLE_BY_TYPE.get(row.test_type, "Mock")
    return DashboardAttemptOut(
        id=row.id,
        title=f"{title_base} #{row.id}",
        test_date=row.test_date,
        test_type=row.test_type,
        band_score=row.band_score,
        time_taken_seconds=row.time_taken_seconds,
    )


def _safe_seconds(value: int | None) -> int:
    if value is None:
        return 0
    return max(0, int(value))


def _resolve_year(year: int | None) -> int:
    return year or datetime.now(UTC).year


def _normalize_modules(modules: list[ProgressTestTypeEnum] | None) -> list[ProgressTestTypeEnum]:
    if not modules:
        return list(ALL_ACTIVITY_MODULES)

    selected_set = set(modules)
    normalized = [module for module in ALL_ACTIVITY_MODULES if module in selected_set]
    return normalized or list(ALL_ACTIVITY_MODULES)


def _activity_intensity(total_minutes: int) -> int:
    if total_minutes <= 0:
        return 0
    if total_minutes <= 15:
        return 1
    if total_minutes <= 45:
        return 2
    if total_minutes <= 90:
        return 3
    return 4


def _predicted_overall_band(rows: list[UserProgress]) -> Decimal:
    latest_by_module: dict[ProgressTestTypeEnum, Decimal] = {}

    for row in rows:
        if row.test_type in latest_by_module:
            continue
        latest_by_module[row.test_type] = Decimal(str(row.band_score))

    if not latest_by_module:
        return Decimal("0.0")

    total = sum(latest_by_module.values(), Decimal("0.0"))
    average = total / Decimal(len(latest_by_module))
    return average.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def _minutes_this_week(rows: list[UserProgress], today: date) -> int:
    week_start = today - timedelta(days=6)
    total_seconds = sum(
        _safe_seconds(item.time_taken_seconds)
        for item in rows
        if week_start <= item.test_date.date() <= today
    )
    return total_seconds // 60


def _current_streak(rows: list[UserProgress], today: date) -> int:
    active_dates = {item.test_date.date() for item in rows}
    if not active_dates:
        return 0

    yesterday = today - timedelta(days=1)
    if today in active_dates:
        anchor = today
    elif yesterday in active_dates:
        anchor = yesterday
    else:
        return 0

    streak = 0
    cursor = anchor
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


async def get_or_create_profile(db: AsyncSession, user: User) -> UserProfile:
    profile = await repository.get_profile_by_user_id(db, user.id)
    if profile is None:
        profile = await repository.create_profile(db, user.id)
    return profile


async def get_or_create_analytics(db: AsyncSession, user: User) -> UserAnalytics:
    analytics = await repository.get_analytics_by_user_id(db, user.id)
    if analytics is None:
        analytics = await repository.create_analytics(db, user.id)
    return analytics


async def patch_profile(db: AsyncSession, user: User, payload: dict) -> ProfileOut:
    profile = await get_or_create_profile(db, user)
    for key, value in payload.items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return _profile_out(profile)


async def list_progress(db: AsyncSession, user: User, offset: int, limit: int) -> OffsetPage:
    rows = await repository.list_progress_by_user_id(
        db,
        user_id=user.id,
        offset=offset,
        limit=limit,
    )
    return serialize_page(
        rows,
        serializer=lambda row: _progress_out(row).model_dump(),
        limit=limit,
        offset=offset,
    )


async def create_progress(db: AsyncSession, user: User, payload: dict) -> ProgressOut:
    progress = UserProgress(
        user_id=user.id,
        test_date=datetime.now(UTC),
        band_score=payload["band_score"],
        correct_answers=payload.get("correct_answers"),
        total_questions=payload.get("total_questions"),
        time_taken_seconds=payload.get("time_taken_seconds"),
        test_type=payload["test_type"],
    )
    db.add(progress)
    await db.flush()

    analytics = await get_or_create_analytics(db, user)
    analytics.total_tests_taken += 1
    analytics.best_band_score = max(analytics.best_band_score, progress.band_score)
    analytics.total_study_time_seconds += progress.time_taken_seconds or 0
    analytics.last_test_date = progress.test_date

    total = analytics.average_band_score * Decimal(analytics.total_tests_taken - 1)
    analytics.average_band_score = (total + progress.band_score) / Decimal(analytics.total_tests_taken)

    await db.commit()
    await db.refresh(progress)
    return _progress_out(progress)


async def get_analytics(db: AsyncSession, user: User) -> AnalyticsOut:
    analytics = await get_or_create_analytics(db, user)
    return _analytics_out(analytics)


async def get_dashboard_activity(
    db: AsyncSession,
    user: User,
    *,
    year: int | None,
    modules: list[ProgressTestTypeEnum] | None,
) -> DashboardActivityOut:
    target_year = _resolve_year(year)
    selected_modules = _normalize_modules(modules)

    range_start = datetime(target_year, 1, 1, tzinfo=UTC)
    range_end = datetime(target_year + 1, 1, 1, tzinfo=UTC)

    rows = await repository.list_progress_filtered(
        db,
        user_id=user.id,
        modules=selected_modules,
        start_at=range_start,
        end_at=range_end,
        descending=False,
    )

    all_rows = await repository.list_progress_filtered(
        db,
        user_id=user.id,
        descending=False,
    )

    available_years = sorted({item.test_date.year for item in all_rows} | {target_year}, reverse=True)

    per_day: dict[date, dict[str, int]] = {}
    for row in rows:
        day = row.test_date.date()
        bucket = per_day.setdefault(day, {"attempts": 0, "seconds": 0})
        bucket["attempts"] += 1
        bucket["seconds"] += _safe_seconds(row.time_taken_seconds)

    days: list[DashboardActivityDayOut] = []
    cursor = range_start.date()
    end_date = range_end.date()

    practice_days = 0
    total_attempts = 0
    total_seconds = 0

    while cursor < end_date:
        bucket = per_day.get(cursor, {"attempts": 0, "seconds": 0})
        attempts = bucket["attempts"]
        seconds = bucket["seconds"]
        minutes = seconds // 60
        if attempts > 0:
            practice_days += 1
        total_attempts += attempts
        total_seconds += seconds
        days.append(
            DashboardActivityDayOut(
                date=cursor,
                attempts=attempts,
                total_seconds=seconds,
                total_minutes=minutes,
                intensity=_activity_intensity(minutes),
            )
        )
        cursor += timedelta(days=1)

    return DashboardActivityOut(
        year=target_year,
        settings=DashboardActivitySettingsOut(
            year=target_year,
            available_years=available_years,
            available_modules=list(ALL_ACTIVITY_MODULES),
            selected_modules=selected_modules,
        ),
        summary=DashboardActivitySummaryOut(
            practice_days=practice_days,
            total_attempts=total_attempts,
            total_minutes=total_seconds // 60,
        ),
        days=days,
    )


async def get_dashboard_stats(
    db: AsyncSession,
    user: User,
    *,
    modules: list[ProgressTestTypeEnum] | None,
) -> DashboardStatsOut:
    selected_modules = _normalize_modules(modules)
    rows = await repository.list_progress_filtered(
        db,
        user_id=user.id,
        modules=selected_modules,
        descending=True,
    )
    today = datetime.now(UTC).date()

    return DashboardStatsOut(
        predicted_overall_band=_predicted_overall_band(rows),
        total_attempts=len(rows),
        minutes_this_week=_minutes_this_week(rows, today),
        current_streak=_current_streak(rows, today),
    )


async def list_dashboard_history(
    db: AsyncSession,
    user: User,
    *,
    modules: list[ProgressTestTypeEnum] | None,
    offset: int,
    limit: int,
) -> OffsetPage:
    rows = await repository.list_progress_filtered(
        db,
        user_id=user.id,
        modules=_normalize_modules(modules),
        offset=offset,
        limit=limit,
        descending=True,
    )
    return serialize_page(
        rows,
        serializer=lambda row: _dashboard_attempt_out(row).model_dump(),
        limit=limit,
        offset=offset,
    )


async def get_quick_links(db: AsyncSession, user: User) -> DashboardQuickLinksOut:
    reading_stats = await repository.get_reading_attempt_summary(db, user_id=user.id)
    listening_stats = await repository.get_listening_attempt_summary(db, user_id=user.id)
    writing_stats = await repository.get_writing_attempt_summary(db, user_id=user.id)

    return DashboardQuickLinksOut(
        items=[
            DashboardQuickLinkOut(
                label="Reading",
                path="/dashboard/reading",
                module=ProgressTestTypeEnum.reading,
                attempts_count=reading_stats["attempts_count"],
                successful_attempts_count=reading_stats["successful_attempts_count"],
                failed_attempts_count=reading_stats["failed_attempts_count"],
            ),
            DashboardQuickLinkOut(
                label="Listening",
                path="/dashboard/listening",
                module=ProgressTestTypeEnum.listening,
                attempts_count=listening_stats["attempts_count"],
                successful_attempts_count=listening_stats["successful_attempts_count"],
                failed_attempts_count=listening_stats["failed_attempts_count"],
            ),
            DashboardQuickLinkOut(
                label="Writing",
                path="/dashboard/writing",
                module=ProgressTestTypeEnum.writing,
                attempts_count=writing_stats["attempts_count"],
                successful_attempts_count=writing_stats["successful_attempts_count"],
                failed_attempts_count=writing_stats["failed_attempts_count"],
            ),
            DashboardQuickLinkOut(
                label="Speaking",
                path="/dashboard/speaking",
                module=ProgressTestTypeEnum.speaking,
                attempts_count=0,
                successful_attempts_count=0,
                failed_attempts_count=0,
            ),
            DashboardQuickLinkOut(
                label="Profile",
                path="/dashboard/profile",
                module=None,
                attempts_count=0,
                successful_attempts_count=0,
                failed_attempts_count=0,
            ),
        ]
    )
