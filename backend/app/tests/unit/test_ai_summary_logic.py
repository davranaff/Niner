from app.db.models import AiSummaryModuleEnum
from app.modules.ai_summary.services.analysis import (
    build_summary_payload,
    compute_improvement,
    timing_analysis,
)
from app.modules.ai_summary.services.core import _manual_debounce_hit


def test_manual_debounce_logic_daily_limit() -> None:
    assert _manual_debounce_hit(0) is False
    assert _manual_debounce_hit(2) is False
    assert _manual_debounce_hit(3) is True
    assert _manual_debounce_hit(10) is True


def test_timing_analysis_overtime_seconds() -> None:
    payload = timing_analysis(
        [
            {
                "time_spent_seconds": 3800,
                "time_limit_seconds": 3600,
            },
            {
                "time_spent_seconds": 3400,
                "time_limit_seconds": 3600,
            },
        ]
    )

    assert payload["attempts"] == 2
    assert payload["latest_time_spent_seconds"] == 3800
    assert payload["overtime_seconds"] == 200


def test_compute_improvement_trend() -> None:
    improving = compute_improvement([7.0, 6.5, 6.0])
    assert improving["trend"] == "improving"
    assert improving["delta"] == 0.5

    stable = compute_improvement([6.5, 6.5])
    assert stable["trend"] == "stable"


def test_grammar_heuristic_mapping_for_reading_blocks() -> None:
    summary = build_summary_payload(
        AiSummaryModuleEnum.reading,
        [
            {
                "score": 6.0,
                "test_title": "Mock 1",
                "time_spent_seconds": 3700,
                "time_limit_seconds": 3600,
                "correct_answers": 20,
                "total_questions": 40,
                "mistakes": [
                    {
                        "question_id": 1,
                        "question_text": "Q1",
                        "block_type": "true_false_ng",
                        "user_answer": "True",
                        "correct_answer": "False",
                    },
                    {
                        "question_id": 2,
                        "question_text": "Q2",
                        "block_type": "table_completion",
                        "user_answer": "three words",
                        "correct_answer": "one word",
                    },
                ],
            }
        ],
    )

    focus_items = summary["grammar_focus"]
    focus_types = {item["focus"] for item in focus_items}
    assert "true_false_ng" in focus_types
    assert "table_completion" in focus_types
    assert summary["timing_analysis"]["overtime_seconds"] == 100
