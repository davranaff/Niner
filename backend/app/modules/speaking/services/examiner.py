from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx

from app.core.config import settings
from app.modules.speaking.schemas import (
    SpeakingExaminerDecisionIn,
    SpeakingExaminerDecisionOut,
    SpeakingPartId,
    SpeakingQuestionDetail,
    SpeakingSessionState,
    SpeakingTestDetail,
)

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

DECISION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "kind": {
            "type": "string",
            "enum": [
                "examiner_prompt",
                "prepare_part2",
                "follow_up",
                "reprompt",
                "rescue_prompt",
                "gentle_redirect",
                "move_on",
                "finish",
            ],
        },
        "questionId": {"type": "string"},
        "text": {"type": "string"},
        "rationale": {"type": "string"},
    },
    "required": ["kind", "questionId", "text", "rationale"],
}

SAME_QUESTION_KINDS = {
    "examiner_prompt",
    "follow_up",
    "reprompt",
    "rescue_prompt",
    "gentle_redirect",
}
NEXT_QUESTION_KINDS = {"move_on", "prepare_part2"}

REPEAT_PATTERNS = [
    r"\bsorry\b",
    r"\bpardon\b",
    r"\bcould you repeat\b",
    r"\bcan you repeat\b",
    r"\bsay that again\b",
    r"\bwhat do you mean\b",
    r"\bi did not catch\b",
    r"\bi didn't catch\b",
    r"\bi do not understand\b",
    r"\bi don't understand\b",
]

PROFANITY_PATTERNS = [
    r"\bfuck\b",
    r"\bshit\b",
    r"\basshole\b",
    r"\bbitch\b",
    r"\bmotherfucker\b",
]

WORK_TERMS = {"work", "working", "job", "office", "company", "employee", "business"}
STUDY_TERMS = {"study", "student", "school", "college", "university", "course"}
INTRO_NAME_PREFIXES = ("my name is", "i am", "i'm")


def _examiner_model() -> str:
    return os.getenv("OPENAI_EXAMINER_MODEL", "gpt-4o-mini")


def _examiner_api_key() -> str:
    return (settings.openai_api_key or "").strip()


def normalize_text(text: str) -> str:
    return " ".join(text.split()).strip()


def normalize_for_match(text: str) -> str:
    return re.sub(r"[^a-z0-9\s']", " ", text.lower()).strip()


def contains_any_pattern(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def stable_pick(seed: str, options: list[str]) -> str:
    if not options:
        return ""
    total = sum(ord(character) for character in seed)
    return options[total % len(options)]


def flatten_questions(test: SpeakingTestDetail) -> list[SpeakingQuestionDetail]:
    return [question for part in test.parts for question in part.questions]


def get_current_question(test: SpeakingTestDetail, session: SpeakingSessionState) -> SpeakingQuestionDetail:
    questions = flatten_questions(test)
    index = min(max(session.current_question_index, 0), len(questions) - 1)
    return questions[index]


def get_next_question(test: SpeakingTestDetail, session: SpeakingSessionState) -> SpeakingQuestionDetail | None:
    questions = flatten_questions(test)
    next_index = session.current_question_index + 1
    if next_index >= len(questions):
        return None
    return questions[next_index]


def question_payload(question: SpeakingQuestionDetail | None) -> dict[str, Any] | None:
    if question is None:
        return None

    return {
        "id": question.id,
        "partId": question.part_id.value,
        "shortLabel": question.short_label,
        "prompt": question.prompt,
        "rephrasePrompt": question.rephrase_prompt,
        "followUps": question.follow_ups,
        "cueCard": question.cue_card.model_dump(mode="json") if question.cue_card else None,
    }


def build_recent_history(session: SpeakingSessionState, limit: int = 6) -> list[dict[str, Any]]:
    segments = [segment for segment in session.transcript_segments if segment.is_final][-limit:]
    return [
        {
            "speaker": segment.speaker,
            "questionId": segment.question_id,
            "partId": segment.part_id.value,
            "text": segment.text,
            "interrupted": bool(segment.interrupted),
        }
        for segment in segments
    ]


def build_prompt_payload(
    request: SpeakingExaminerDecisionIn,
    test: SpeakingTestDetail,
    current_question: SpeakingQuestionDetail,
    next_question: SpeakingQuestionDetail | None,
) -> dict[str, Any]:
    evaluation = request.evaluation
    metrics = request.metrics
    answer_text = evaluation.cleaned_transcript or metrics.transcript

    return {
        "exam": {
            "title": test.title,
            "currentPartId": request.session.current_part_id.value,
            "askedQuestionIds": request.session.asked_question_ids,
        },
        "currentQuestion": question_payload(current_question),
        "nextQuestion": question_payload(next_question),
        "candidateAnswer": {
            "text": answer_text,
            "durationMs": metrics.duration_ms,
            "wordCount": metrics.word_count,
            "wasCutOff": metrics.was_cut_off,
            "wasSilent": metrics.was_silent,
            "followUpsUsed": metrics.follow_ups_used,
            "silencePromptsUsed": metrics.silence_prompts_used,
        },
        "answerEvaluation": request.evaluation.model_dump(mode="json"),
        "recentHistory": build_recent_history(request.session),
        "allowedRules": {
            "sameQuestionKinds": sorted(SAME_QUESTION_KINDS),
            "nextQuestionKinds": sorted(NEXT_QUESTION_KINDS),
            "sameQuestionId": current_question.id,
            "nextQuestionId": next_question.id if next_question else None,
            "if_next_question_is_part2_use": "prepare_part2",
            "if_no_next_question_use": "finish",
        },
    }


def build_system_prompt() -> str:
    return (
        "You are the decision engine behind a realtime IELTS Speaking examiner. "
        "Decide what the examiner should say next after hearing one candidate answer. "
        "The examiner is calm, neutral, professional, concise, and context-aware. "
        "Do not teach, praise, coach, explain band scores, or chat casually. "
        "Stay within IELTS Speaking behavior. "
        "If the candidate partly answered a compound question, keep the same question and ask only the missing part. "
        "If the answer is relevant but thin, ask one short follow-up. "
        "If the answer is irrelevant or does not address the question, gently redirect once. "
        "If the answer is sufficient, move on naturally. "
        "Part 1 should stay personal and short. "
        "Part 2 should be structured, with a natural cue-card introduction and mostly listening during the long turn. "
        "Part 3 should sound broader and more analytical than Part 1. "
        "When moving from Part 1 to Part 2, use kind prepare_part2. "
        "When moving from Part 2 to Part 3, use kind move_on with a smooth bridge. "
        "Use only the provided question ids. "
        "Your utterance must sound like a real IELTS examiner, not a tutor or generic assistant."
    )


def extract_output_text(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            content_type = content.get("type")
            if content_type in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str) and text.strip():
                    return text.strip()

    raise RuntimeError("Examiner decision response did not include structured text output.")


def coerce_decision(
    raw_decision: dict[str, Any],
    current_question: SpeakingQuestionDetail,
    next_question: SpeakingQuestionDetail | None,
) -> SpeakingExaminerDecisionOut:
    kind = str(raw_decision.get("kind", "")).strip()
    question_id = str(raw_decision.get("questionId", "")).strip()
    text = normalize_text(str(raw_decision.get("text", "")).strip())
    rationale = normalize_text(str(raw_decision.get("rationale", "")).strip())

    if not text:
        raise RuntimeError("Examiner decision did not include usable examiner text.")

    current_question_id = current_question.id
    next_question_id = next_question.id if next_question else None

    if kind in SAME_QUESTION_KINDS:
        question_id = current_question_id
    elif kind in NEXT_QUESTION_KINDS:
        if next_question_id is None:
            kind = "finish"
            question_id = current_question_id
        else:
            question_id = next_question_id
            if next_question and next_question.part_id == SpeakingPartId.part_2:
                kind = "prepare_part2"
            elif kind == "prepare_part2":
                kind = "move_on"
    elif kind == "finish":
        if next_question_id is not None:
            raise RuntimeError("LLM attempted to finish the exam before the final question.")
        question_id = current_question_id
    else:
        raise RuntimeError(f"Unsupported examiner decision kind: {kind}")

    return SpeakingExaminerDecisionOut(
        kind=kind,
        question_id=question_id,
        text=text,
        rationale=rationale or "Model selected the next IELTS examiner move from answer context.",
        source="llm",
    )


def recent_examiner_texts(session: SpeakingSessionState) -> list[str]:
    return [
        normalize_text(segment.text).lower()
        for segment in session.transcript_segments[-6:]
        if segment.speaker == "examiner"
    ]


def looks_like_name(answer: str) -> bool:
    normalized = normalize_for_match(answer)
    if any(normalized.startswith(prefix) for prefix in INTRO_NAME_PREFIXES):
        return True

    tokens = [token for token in normalized.split() if token not in {"hello", "hi", "good", "morning"}]
    alpha_tokens = [token for token in tokens if token.isalpha()]
    return 2 <= len(alpha_tokens) <= 5


def mentions_work_or_study(answer: str) -> bool:
    tokens = set(normalize_for_match(answer).split())
    return bool(tokens & (WORK_TERMS | STUDY_TERMS))


def build_question_prompt(
    question: SpeakingQuestionDetail,
    previous_question: SpeakingQuestionDetail | None = None,
) -> str:
    if (
        question.part_id != SpeakingPartId.part_1
        or previous_question is None
        or previous_question.part_id != SpeakingPartId.part_1
    ):
        return question.prompt

    if re.match(
        r"^(now|let us|let's|i would like|i'd like|all right|okay|thank you)\\b",
        question.prompt.strip(),
        flags=re.IGNORECASE,
    ):
        return question.prompt

    lead_in = stable_pick(
        f"{previous_question.id}:{question.id}:lead",
        [
            f"Now I'd like to ask you about {question.short_label.lower()}.",
            f"Let us talk about {question.short_label.lower()}.",
            f"Now let us move on to {question.short_label.lower()}.",
        ],
    )
    return f"{lead_in} {question.prompt}"


def build_rephrase_prompt(question: SpeakingQuestionDetail) -> str:
    return stable_pick(
        f"{question.id}:rephrase",
        [
            question.rephrase_prompt or question.prompt,
            f"Certainly. {question.rephrase_prompt or question.prompt}",
        ],
    )


def build_no_answer_prompt(question: SpeakingQuestionDetail, in_preparation: bool) -> str:
    if question.part_id == SpeakingPartId.part_2:
        if in_preparation:
            return stable_pick(
                f"{question.id}:prep-reminder",
                [
                    "Take your time. Use this moment to make a few brief notes.",
                    "Take your time. Use this time to prepare what you want to say.",
                ],
            )
        return stable_pick(
            f"{question.id}:part2-start-reminder",
            [
                "Take your time. You can begin when you are ready.",
                "All right. Please start when you are ready.",
            ],
        )

    return stable_pick(
        f"{question.id}:no-answer",
        [
            f"Take your time. {question.rephrase_prompt or question.prompt}",
            question.rephrase_prompt or question.prompt,
        ],
    )


def build_rescue_prompt(question: SpeakingQuestionDetail) -> str:
    if question.part_id == SpeakingPartId.part_2:
        cue_card = question.cue_card
        first_point = cue_card.bullet_points[0] if cue_card and cue_card.bullet_points else "what happened"
        second_point = cue_card.bullet_points[1] if cue_card and len(cue_card.bullet_points) > 1 else None
        prompts = [
            f"That is all right. Just tell me about {first_point}.",
            f"That is fine. Start by saying {first_point}.",
        ]
        if second_point:
            prompts.append(f"You can begin with {first_point}, and then mention {second_point}.")
        return stable_pick(f"{question.id}:rescue", prompts)

    if question.part_id == SpeakingPartId.part_3:
        return stable_pick(
            f"{question.id}:rescue",
            [
                "That is all right. Just give me your general view.",
                "That is fine. What is your opinion on this?",
            ],
        )

    return stable_pick(
        f"{question.id}:rescue",
        [
            "That is all right. Just tell me a little about your own experience.",
            "That is fine. Just say a little about that.",
        ],
    )


def build_redirect_prompt(question: SpeakingQuestionDetail) -> str:
    if question.part_id == SpeakingPartId.part_2:
        return stable_pick(
            f"{question.id}:redirect",
            [
                f"I am asking about {question.short_label.lower()}. {question.rephrase_prompt or question.prompt}",
                f"Let us stay with the topic. {question.rephrase_prompt or question.prompt}",
            ],
        )

    return stable_pick(
        f"{question.id}:redirect",
        [
            f"I am asking specifically about {question.short_label.lower()}. {question.rephrase_prompt or question.prompt}",
            f"Let us focus on {question.short_label.lower()}. {question.rephrase_prompt or question.prompt}",
        ],
    )


def build_move_on_lead_in(question: SpeakingQuestionDetail, cut_off: bool) -> str:
    if question.part_id == SpeakingPartId.part_2:
        return stable_pick(
            f"{question.id}:{cut_off}:part2-close",
            ["Thank you.", "All right. Thank you."] if cut_off else ["Thank you."],
        )

    return stable_pick(
        f"{question.id}:{cut_off}:move-on",
        ["All right. Thank you.", "Okay. Thank you.", "Thank you."]
        if cut_off
        else ["All right.", "Okay.", "Thank you."],
    )


def build_part2_introduction(question: SpeakingQuestionDetail) -> str:
    topic = question.cue_card.topic if question.cue_card else "the topic on your screen"
    normalized_topic = re.sub(r"^Describe\\s+", "", topic).rstrip(".").strip().lower()
    return stable_pick(
        f"{question.id}:part2-intro",
        [
            f"Now I am going to give you a topic. I would like you to talk about {normalized_topic}. You will have one minute to prepare, and then I would like you to speak for one to two minutes.",
            f"Now I would like you to talk about {normalized_topic}. You will have one minute to prepare, and then I would like you to speak for one to two minutes.",
        ],
    )


def build_part3_transition(question: SpeakingQuestionDetail, lead_in: str | None = None) -> str:
    bridge = stable_pick(
        f"{question.id}:part3-bridge",
        [
            "Now I would like to ask you some more general questions about this.",
            "Let us talk more generally about this topic.",
            "I would like to ask you some broader questions about this.",
        ],
    )
    prefix = lead_in or "Thank you."
    return f"{prefix} {bridge} {question.prompt}".strip()


def build_closing_prompt(lead_in: str | None = None) -> str:
    prefix = lead_in or "Thank you."
    ending = stable_pick(
        f"closing:{prefix}",
        ["That is the end of the speaking test.", "This is the end of the speaking test."],
    )
    return f"{prefix} {ending}".strip()


def pick_first_unused(seed: str, candidates: list[str], recent_texts: list[str]) -> str:
    if not candidates:
        return ""

    normalized_recent = set(recent_texts)
    fresh = [candidate for candidate in candidates if normalize_text(candidate).lower() not in normalized_recent]
    pool = fresh or candidates
    return stable_pick(seed, pool)


def build_missing_detail_prompt(question: SpeakingQuestionDetail, answer_text: str) -> str | None:
    prompt_text = normalize_for_match(f"{question.prompt} {question.rephrase_prompt or ''}")
    answer_normalized = normalize_for_match(answer_text)

    asks_name = "full name" in prompt_text or re.search(r"\\byour name\\b", prompt_text) is not None
    asks_work_or_study = bool(set(prompt_text.split()) & (WORK_TERMS | STUDY_TERMS))

    if asks_name and not looks_like_name(answer_text):
        return "Could you tell me your full name?"

    if asks_work_or_study and not mentions_work_or_study(answer_text):
        return "And do you work or are you a student?"

    if question.part_id == SpeakingPartId.part_2 and question.cue_card:
        cue_points = question.cue_card.bullet_points
        if cue_points:
            first_point = cue_points[0]
            if normalize_for_match(first_point).split()[0] not in answer_normalized:
                return f"Can you start by saying {first_point}?"

    return None


def build_contextual_follow_up(
    question: SpeakingQuestionDetail,
    answer_text: str,
    follow_ups_used: int,
    session: SpeakingSessionState,
) -> str:
    recent_texts = recent_examiner_texts(session)
    missing_detail_prompt = build_missing_detail_prompt(question, answer_text)
    if missing_detail_prompt:
        return missing_detail_prompt

    prompts = list(question.follow_ups or [])
    if question.part_id == SpeakingPartId.part_2 and question.cue_card:
        cue_points = question.cue_card.bullet_points
        if cue_points:
            prompts.extend(
                [
                    "Can you tell me what happened in that situation?",
                    "And what did you do to help?",
                ]
            )

    if not prompts:
        prompts = (
            ["Can you tell me a bit more about that?"]
            if question.part_id == SpeakingPartId.part_1
            else ["Can you say a little more about that?"]
            if question.part_id == SpeakingPartId.part_2
            else ["Why do you think that is?"]
        )

    ordered = prompts[follow_ups_used:] + prompts[:follow_ups_used]
    return pick_first_unused(f"{question.id}:follow-up:{follow_ups_used}", ordered, recent_texts)


def build_next_question_text(current_question: SpeakingQuestionDetail, next_question: SpeakingQuestionDetail) -> str:
    if current_question.part_id == SpeakingPartId.part_1 and next_question.part_id == SpeakingPartId.part_2:
        return build_part2_introduction(next_question)

    if current_question.part_id == SpeakingPartId.part_2 and next_question.part_id == SpeakingPartId.part_3:
        return build_part3_transition(next_question)

    return build_question_prompt(next_question, current_question)


def build_move_on_decision(
    current_question: SpeakingQuestionDetail,
    next_question: SpeakingQuestionDetail | None,
    *,
    cut_off: bool = False,
) -> SpeakingExaminerDecisionOut:
    lead_in = build_move_on_lead_in(current_question, cut_off)

    if next_question is None:
        return SpeakingExaminerDecisionOut(
            kind="finish",
            question_id=current_question.id,
            text=build_closing_prompt(lead_in),
            rationale="The candidate answer was sufficient and the speaking test can close.",
            source="fallback",
        )

    if current_question.part_id == SpeakingPartId.part_1 and next_question.part_id == SpeakingPartId.part_2:
        return SpeakingExaminerDecisionOut(
            kind="prepare_part2",
            question_id=next_question.id,
            text=build_part2_introduction(next_question),
            rationale="Part 1 is complete, so the examiner is moving naturally into the cue-card task.",
            source="fallback",
        )

    if current_question.part_id == SpeakingPartId.part_2 and next_question.part_id == SpeakingPartId.part_3:
        return SpeakingExaminerDecisionOut(
            kind="move_on",
            question_id=next_question.id,
            text=build_part3_transition(next_question, lead_in),
            rationale="The long turn is complete, so the examiner is transitioning into broader Part 3 discussion.",
            source="fallback",
        )

    next_text = build_next_question_text(current_question, next_question)
    full_text = f"{lead_in} {next_text}".strip()
    return SpeakingExaminerDecisionOut(
        kind="move_on",
        question_id=next_question.id,
        text=full_text,
        rationale="The candidate answer was sufficient and the examiner is moving to the next topic naturally.",
        source="fallback",
    )


def build_fallback_decision(
    request: SpeakingExaminerDecisionIn,
    test: SpeakingTestDetail,
) -> SpeakingExaminerDecisionOut:
    current_question = get_current_question(test, request.session)
    next_question = get_next_question(test, request.session)
    answer_text = normalize_text(request.evaluation.cleaned_transcript or request.metrics.transcript)
    answer_lower = normalize_for_match(answer_text)
    in_preparation = request.session.prep_remaining_seconds > 0

    if contains_any_pattern(answer_lower, REPEAT_PATTERNS) or request.evaluation.action == "rephrase":
        return SpeakingExaminerDecisionOut(
            kind="reprompt",
            question_id=current_question.id,
            text=build_rephrase_prompt(current_question),
            rationale="The candidate asked for the question to be repeated or clarified.",
            source="fallback",
        )

    if contains_any_pattern(answer_lower, PROFANITY_PATTERNS):
        return SpeakingExaminerDecisionOut(
            kind="gentle_redirect",
            question_id=current_question.id,
            text=build_redirect_prompt(current_question),
            rationale="The response was not usable, so the examiner is redirecting back to the actual task.",
            source="fallback",
        )

    if request.evaluation.action == "rescue_prompt":
        if request.metrics.was_silent and request.metrics.silence_prompts_used == 0:
            return SpeakingExaminerDecisionOut(
                kind="reprompt",
                question_id=current_question.id,
                text=build_no_answer_prompt(current_question, in_preparation),
                rationale="The candidate did not give a usable answer, so the examiner is gently prompting once more.",
                source="fallback",
            )
        return SpeakingExaminerDecisionOut(
            kind="rescue_prompt",
            question_id=current_question.id,
            text=build_rescue_prompt(current_question),
            rationale="The candidate needs a light neutral prompt to continue without coaching.",
            source="fallback",
        )

    if request.evaluation.action == "gentle_redirect":
        return SpeakingExaminerDecisionOut(
            kind="gentle_redirect",
            question_id=current_question.id,
            text=build_redirect_prompt(current_question),
            rationale="The answer drifted away from the question, so the examiner is bringing it back.",
            source="fallback",
        )

    if request.evaluation.action == "soft_cutoff":
        return build_move_on_decision(current_question, next_question, cut_off=True)

    if request.evaluation.action == "follow_up" and request.metrics.follow_ups_used < 1:
        return SpeakingExaminerDecisionOut(
            kind="follow_up",
            question_id=current_question.id,
            text=build_contextual_follow_up(
                current_question,
                answer_text,
                request.metrics.follow_ups_used,
                request.session,
            ),
            rationale="The answer is valid but incomplete, so the examiner is asking one short follow-up.",
            source="fallback",
        )

    return build_move_on_decision(current_question, next_question, cut_off=request.metrics.was_cut_off)


async def request_llm_decision(
    request: SpeakingExaminerDecisionIn,
    test: SpeakingTestDetail,
) -> SpeakingExaminerDecisionOut:
    api_key = _examiner_api_key()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured for examiner decisions.")

    current_question = get_current_question(test, request.session)
    next_question = get_next_question(test, request.session)
    context_payload = build_prompt_payload(request, test, current_question, next_question)

    payload = {
        "model": _examiner_model(),
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": build_system_prompt()}],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": json.dumps(context_payload, ensure_ascii=False, indent=2),
                    }
                ],
            },
        ],
        "max_output_tokens": 240,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "ielts_examiner_decision",
                "strict": True,
                "schema": DECISION_SCHEMA,
            }
        },
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            OPENAI_RESPONSES_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    response.raise_for_status()
    raw_payload = response.json()
    structured_text = extract_output_text(raw_payload)
    raw_decision = json.loads(structured_text)
    return coerce_decision(raw_decision, current_question, next_question)


async def decide_examiner_turn(
    request: SpeakingExaminerDecisionIn,
    test: SpeakingTestDetail,
) -> SpeakingExaminerDecisionOut:
    try:
        return await request_llm_decision(request, test)
    except Exception as error:  # noqa: BLE001
        logger.warning("Falling back to deterministic examiner decision: %s", error)
        return build_fallback_decision(request, test)
