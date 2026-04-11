from __future__ import annotations

from collections import Counter
from statistics import mean
from typing import Any

from app.db.models import AiSummaryModuleEnum

GRAMMAR_HINTS_BY_BLOCK: dict[str, str] = {
    "true_false_ng": "Practice evidence matching to reduce True/False/Not Given confusion.",
    "yes_no_ng": "Practice evidence matching to reduce Yes/No/Not Given confusion.",
    "multiple_choice": "Improve distractor elimination and key-word scanning.",
    "matching_headings": "Work on paragraph gist extraction before choosing headings.",
    "matching_information": "Train fast detail lookup and synonym detection.",
    "summary_completion": "Improve paraphrase recognition and exact-phrase selection.",
    "table_completion": "Improve precision in short factual phrases and spelling.",
    "flow_chart_completion": "Focus on sequence language and process vocabulary.",
    "sentence_completion": "Practice grammar-fit and collocation choices.",
    "short_answers": "Train concise answer extraction and word-limit discipline.",
    "short_answer": "Train concise answer extraction and word-limit discipline.",
}


def compute_improvement(scores: list[float | None]) -> dict[str, Any]:
    usable = [score for score in scores if score is not None]
    if not usable:
        return {
            "latest_score": None,
            "previous_score": None,
            "delta": None,
            "trend": "insufficient_data",
        }

    latest_score = usable[0]
    previous_score = usable[1] if len(usable) > 1 else None
    delta = round(latest_score - previous_score, 2) if previous_score is not None else None

    if delta is None:
        trend = "insufficient_data"
    elif delta > 0:
        trend = "improving"
    elif delta < 0:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "latest_score": latest_score,
        "previous_score": previous_score,
        "delta": delta,
        "trend": trend,
    }


def _grammar_focus_from_mistakes(module: AiSummaryModuleEnum, mistakes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if module == AiSummaryModuleEnum.writing:
        return []

    counter = Counter(str(item.get("block_type") or "unknown") for item in mistakes)
    results: list[dict[str, Any]] = []
    for block_type, count in counter.most_common(5):
        guidance = GRAMMAR_HINTS_BY_BLOCK.get(block_type, "Improve consistency for this question pattern.")
        results.append(
            {
                "focus": block_type,
                "mistakes": count,
                "guidance": guidance,
            }
        )
    return results


def grammar_focus_for_writing(essays: list[str]) -> list[dict[str, Any]]:
    if not essays:
        return []

    joined = "\n".join(essays)
    tokens = [token for token in joined.replace("\n", " ").split(" ") if token.strip()]
    token_count = len(tokens)
    long_sentences = [s for s in joined.replace("!", ".").replace("?", ".").split(".") if len(s.split()) > 35]

    results: list[dict[str, Any]] = []
    if token_count < 180:
        results.append(
            {
                "focus": "task_development",
                "severity": "high",
                "guidance": "Increase content depth with clearer examples and explanations.",
            }
        )
    if long_sentences:
        results.append(
            {
                "focus": "sentence_control",
                "severity": "medium",
                "guidance": "Split overly long sentences to reduce grammar and punctuation errors.",
            }
        )

    unique_ratio = (len(set(token.lower() for token in tokens)) / token_count) if token_count else 0
    if token_count and unique_ratio < 0.45:
        results.append(
            {
                "focus": "lexical_range",
                "severity": "medium",
                "guidance": "Expand topic vocabulary and avoid repeating the same words.",
            }
        )

    if not results:
        results.append(
            {
                "focus": "grammar_accuracy",
                "severity": "low",
                "guidance": "Maintain grammar consistency and proofread before submit.",
            }
        )
    return results


def timing_analysis(attempts: list[dict[str, Any]]) -> dict[str, Any]:
    if not attempts:
        return {
            "attempts": 0,
            "latest_time_spent_seconds": None,
            "average_time_spent_seconds": None,
            "time_limit_seconds": None,
            "overtime_seconds": 0,
        }

    latest = attempts[0]
    spent_values = [int(a["time_spent_seconds"]) for a in attempts if a.get("time_spent_seconds") is not None]
    avg_spent = int(round(mean(spent_values))) if spent_values else None
    latest_spent = latest.get("time_spent_seconds")
    limit = latest.get("time_limit_seconds")
    overtime = 0
    if latest_spent is not None and limit is not None:
        overtime = max(int(latest_spent) - int(limit), 0)

    return {
        "attempts": len(attempts),
        "latest_time_spent_seconds": latest_spent,
        "average_time_spent_seconds": avg_spent,
        "time_limit_seconds": limit,
        "overtime_seconds": overtime,
    }


def accuracy_analysis(module: AiSummaryModuleEnum, attempts: list[dict[str, Any]]) -> dict[str, Any]:
    if not attempts:
        return {
            "module": module.value,
            "latest_correct": None,
            "latest_total": None,
            "latest_accuracy": None,
            "average_accuracy": None,
        }

    latest = attempts[0]
    latest_correct = latest.get("correct_answers")
    latest_total = latest.get("total_questions")

    def ratio(correct: int | None, total: int | None) -> float | None:
        if correct is None or total in (None, 0):
            return None
        return round((float(correct) / float(total)) * 100, 2)

    latest_accuracy = ratio(latest_correct, latest_total)
    ratios = [ratio(a.get("correct_answers"), a.get("total_questions")) for a in attempts]
    ratios = [value for value in ratios if value is not None]
    average_accuracy = round(float(mean(ratios)), 2) if ratios else None

    return {
        "module": module.value,
        "latest_correct": latest_correct,
        "latest_total": latest_total,
        "latest_accuracy": latest_accuracy,
        "average_accuracy": average_accuracy,
    }


def build_summary_payload(module: AiSummaryModuleEnum, attempts: list[dict[str, Any]]) -> dict[str, Any]:
    latest = attempts[0] if attempts else None
    all_mistakes = [mistake for attempt in attempts for mistake in attempt.get("mistakes", [])]

    if module == AiSummaryModuleEnum.writing:
        essays = [str(part.get("essay") or "") for attempt in attempts for part in attempt.get("parts", [])]
        grammar_focus = grammar_focus_for_writing(essays)
    else:
        grammar_focus = _grammar_focus_from_mistakes(module, all_mistakes)

    topic_counter = Counter(str(attempt.get("test_title") or "unknown") for attempt in attempts)
    topic_focus = [
        {
            "topic": topic,
            "attempts": count,
        }
        for topic, count in topic_counter.most_common(5)
    ]

    scores = [attempt.get("score") for attempt in attempts]
    improvement = compute_improvement(scores)

    hotspots = []
    for item in all_mistakes[:12]:
        hotspots.append(
            {
                "question_id": item.get("question_id"),
                "question_text": item.get("question_text"),
                "block_type": item.get("block_type"),
                "user_answer": item.get("user_answer"),
                "correct_answer": item.get("correct_answer"),
            }
        )

    timing = timing_analysis(attempts)
    accuracy = accuracy_analysis(module, attempts)

    action_plan = [
        "Review all mistakes from the latest attempt before starting a new one.",
        "Complete one timed drill focused on your highest-error block type.",
        "Track overtime and adjust pacing checkpoints every 10 minutes.",
    ]
    if module == AiSummaryModuleEnum.writing:
        action_plan = [
            "Rewrite one paragraph from your latest essay with shorter, cleaner sentences.",
            "Add 2-3 concrete examples per body paragraph to strengthen task response.",
            "Spend final 5 minutes on grammar and punctuation proofreading.",
        ]

    latest_score = latest.get("score") if latest else None
    summary_text = (
        f"Latest {module.value} performance is {latest_score if latest_score is not None else 'not scored yet'}. "
        f"You made {len(all_mistakes)} tracked mistakes across recent attempts. "
        f"Current trend is {improvement.get('trend')} and overtime is {timing.get('overtime_seconds')} seconds."
    )

    return {
        "timing_analysis": timing,
        "accuracy_analysis": accuracy,
        "mistake_hotspots": hotspots,
        "grammar_focus": grammar_focus,
        "topic_focus": topic_focus,
        "improvement": improvement,
        "action_plan": action_plan,
        "summary_text": summary_text,
    }
