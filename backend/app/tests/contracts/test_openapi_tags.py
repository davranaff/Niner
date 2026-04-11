from app.main import app


def _operation_tags(schema: dict, path: str, method: str) -> set[str]:
    return set(schema["paths"][path][method]["tags"])


def test_openapi_tags_metadata_and_grouping() -> None:
    schema = app.openapi()

    tag_names = [tag["name"] for tag in schema.get("tags", [])]
    expected_tags = {
        "system",
        "auth",
        "users",
        "reading",
        "listening",
        "writing",
        "exams",
        "profile",
        "progress",
        "analytics",
        "dashboard",
        "teacher-students",
        "ai",
        "ai-stream",
        "lessons",
        "admin-reading",
        "admin-listening",
        "admin-writing",
        "admin-exams",
        "admin-lessons",
    }
    assert expected_tags.issubset(set(tag_names))

    assert _operation_tags(schema, "/api/v1/profile", "get") == {"profile"}
    assert _operation_tags(schema, "/api/v1/progress", "get") == {"progress"}
    assert _operation_tags(schema, "/api/v1/analytics", "get") == {"analytics"}
    assert _operation_tags(schema, "/api/v1/dashboard/activity", "get") == {"dashboard"}

    assert _operation_tags(schema, "/api/v1/admin/reading/tests", "post") == {"admin-reading"}
    assert _operation_tags(schema, "/api/v1/admin/listening/tests", "post") == {"admin-listening"}
    assert _operation_tags(schema, "/api/v1/admin/writing/tests", "post") == {"admin-writing"}
    assert _operation_tags(schema, "/api/v1/admin/exams/{kind}", "get") == {"admin-exams"}
    assert _operation_tags(schema, "/api/v1/admin/lessons", "get") == {"admin-lessons"}

    assert _operation_tags(schema, "/api/v1/teacher/students/invites", "post") == {"teacher-students"}
    assert _operation_tags(schema, "/api/v1/students/me/teacher/accept-invite", "post") == {"teacher-students"}
    assert _operation_tags(schema, "/api/v1/ai/summaries", "post") == {"ai"}
    assert _operation_tags(schema, "/api/v1/ai/summaries/{summary_id}/stream", "get") == {"ai-stream"}
