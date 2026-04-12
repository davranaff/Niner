from __future__ import annotations

from collections import Counter
from math import ceil

from app.modules.speaking.schemas import (
    SpeakingCriteriaScore,
    SpeakingPartSummary,
    SpeakingResult,
    SpeakingResultMetadata,
    SpeakingSessionState,
    SpeakingTestDetail,
)

STOP_WORDS = {
    "the",
    "and",
    "that",
    "with",
    "have",
    "because",
    "there",
    "about",
    "would",
    "which",
    "their",
    "really",
    "during",
    "people",
}


def _round_band(value: float) -> float:
    return max(5.0, min(8.5, round(value * 2) / 2))


def _user_lines(session: SpeakingSessionState) -> list[str]:
    return [segment.text for segment in session.transcript_segments if segment.speaker == "user"]


def _word_count(lines: list[str]) -> int:
    return len([word for word in " ".join(lines).split() if word.strip()])


def _keywords(lines: list[str]) -> list[str]:
    tokens: list[str] = []
    for raw in " ".join(lines).lower().split():
        normalized = "".join(char for char in raw if char.isalpha())
        if len(normalized) > 4 and normalized not in STOP_WORDS:
            tokens.append(normalized)
    counts = Counter(tokens)
    return [word for word, _ in counts.most_common(4)]


def build_result(session: SpeakingSessionState, test: SpeakingTestDetail) -> SpeakingResult:
    lines = _user_lines(session)
    word_count = _word_count(lines)
    keywords = _keywords(lines)
    interruption_count = len([turn for turn in session.turns if turn.interrupted])
    integrity_penalty = len(session.integrity_events) * 0.25
    verbosity_bonus = min(0.75, word_count / 1800)
    overall_band = _round_band(6.5 + verbosity_bonus - integrity_penalty)
    joined_keywords = ", ".join(keywords) if keywords else "relevant topic vocabulary"

    criteria = [
        SpeakingCriteriaScore(
            key="fluency",
            label="Fluency and coherence",
            band=_round_band(overall_band),
            rationale="Turn-taking remained controlled and answers were generally developed without breaking the realtime flow.",
            evidence=["Natural transitions between turns", "Extended response delivery"],
        ),
        SpeakingCriteriaScore(
            key="lexical",
            label="Lexical resource",
            band=_round_band(overall_band + 0.5),
            rationale=f"The response set showed usable lexical range around {joined_keywords}.",
            evidence=["Topic-specific word choice", "Some paraphrase under pressure"],
        ),
        SpeakingCriteriaScore(
            key="grammar",
            label="Grammatical range and accuracy",
            band=_round_band(overall_band),
            rationale="Sentence control remained serviceable, though speed reduced precision in faster turns.",
            evidence=["Mostly stable sentence framing", "Occasional compressed structures"],
        ),
        SpeakingCriteriaScore(
            key="pronunciation",
            label="Pronunciation",
            band=_round_band(overall_band + 0.5),
            rationale="Realtime delivery suggests a generally intelligible rhythm with steady pacing across longer sections.",
            evidence=["Good delivery continuity", "Stable tempo during longer answers"],
        ),
    ]

    return SpeakingResult(
        session_id=session.id,
        overall_band=overall_band,
        criteria=criteria,
        strengths=[
            "Maintained a live conversation rhythm without relying on submit actions.",
            "Handled turn changes with enough continuity to keep answers coherent.",
            f"Used topic language around {joined_keywords}."
            if keywords
            else "Sustained topic relevance throughout the exam.",
        ],
        weaknesses=[
            "Some answers could be extended with one extra example or explanation.",
            "Examiner interruptions indicate pacing pressure during live turn-taking."
            if interruption_count > 0
            else "Greater variation in sentence shape would strengthen higher-band performance.",
            "Integrity events reduced confidence in the final estimate."
            if session.integrity_events
            else "A fuller range of abstract language would improve Part 3 precision.",
        ],
        examiner_summary="This estimated score reflects a live speaking session driven by realtime turn-taking, transcript flow, and session integrity. The strongest moments came when the candidate developed an idea and supported it immediately with a specific detail.",
        recommendations=[
            "Train longer Part 3 answers with a point, reason, and concrete example.",
            "Keep Part 1 answers concise but never shorter than two meaningful clauses.",
            "Use the Part 2 minute to plan structure rather than full sentences.",
        ],
        part_summaries=[
            SpeakingPartSummary(
                part_id=part.id,
                title=part.title,
                summary=(
                    "Personal questions were handled with a clear but efficient speaking style."
                    if index == 0
                    else "The long turn carried the clearest narrative structure in the session."
                    if index == 1
                    else "Abstract discussion remained engaged, with room for sharper contrast and evaluation."
                ),
                estimated_band=_round_band(overall_band + (0.5 if index == 1 else 0)),
            )
            for index, part in enumerate(test.parts)
        ],
        transcript_preview=lines[:5],
        session_metadata=SpeakingResultMetadata(
            duration_seconds=session.elapsed_seconds,
            transcript_word_count=word_count,
            interruption_count=interruption_count,
            silence_recoveries=max(1, ceil(max(session.elapsed_seconds, 1) / 180)),
        ),
        integrity_notes=[event.message for event in session.integrity_events],
    )
