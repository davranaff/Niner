from __future__ import annotations

import pytest

from app.tests.integration.endpoint_coverage import (
    CoverageContext,
    cover_admin_content_crud,
    cover_admin_delete_endpoints,
    cover_admin_exam_endpoints,
    cover_ai_summary_endpoints,
    cover_auth_users_profile_dashboard,
    cover_exam_flows,
    cover_health_and_readiness,
    cover_public_catalog_and_lessons,
    cover_teacher_student_binding,
)


@pytest.mark.asyncio
async def test_all_endpoints_are_covered(client, db_session):
    ctx = CoverageContext.create(client=client, db_session=db_session)

    await cover_health_and_readiness(ctx)
    await cover_auth_users_profile_dashboard(ctx)
    await cover_teacher_student_binding(ctx)
    await cover_admin_content_crud(ctx)
    await cover_public_catalog_and_lessons(ctx)
    await cover_exam_flows(ctx)
    await cover_ai_summary_endpoints(ctx)
    await cover_admin_exam_endpoints(ctx)
    await cover_admin_delete_endpoints(ctx)

    missing = ctx.expected_ops - ctx.called_ops
    extra = ctx.called_ops - ctx.expected_ops

    assert not missing, f"Missing endpoint coverage for: {sorted(missing)}"
    assert not extra, f"Unknown/extra called operations: {sorted(extra)}"
