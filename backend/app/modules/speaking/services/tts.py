from __future__ import annotations

import asyncio
from io import BytesIO
import os
import re

import httpx

from app.core.config import settings

try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

OPENAI_AUDIO_SPEECH_URL = "https://api.openai.com/v1/audio/speech"


def _default_tts_model() -> str:
    return os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")


def _default_tts_voice() -> str:
    return os.getenv("OPENAI_TTS_VOICE", "marin")


def _default_edge_tts_voice() -> str:
    return os.getenv("EDGE_TTS_VOICE", "en-GB-SoniaNeural")


def _default_tts_instructions() -> str:
    return os.getenv(
        "OPENAI_TTS_INSTRUCTIONS",
        "Speak as a calm, neutral IELTS speaking examiner. Sound human, professional, concise, and controlled. Use natural breathing, gentle phrase-final pauses, slightly warm British intonation, and steady exam-room pacing. Do not sound synthetic, cheerful, assistant-like, or like a tutor.",
    )


def normalize_tts_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s+([,.;:?])", r"\1", cleaned)
    cleaned = re.sub(r"([,.;:?!])(?=[^\s])", r"\1 ", cleaned)
    return cleaned


def shape_examiner_text(text: str) -> str:
    shaped = normalize_tts_text(text)
    replacements = {
        r"\bGood morning\b": "Good morning,",
        r"\bAll right\b": "All right,",
        r"\bOkay\b": "Okay,",
        r"\bNow I would like to ask you\b": "Now, I would like to ask you",
        r"\bNow I'd like to ask you\b": "Now, I'd like to ask you",
        r"\bLet us talk\b": "Let us talk",
        r"\bPlease start speaking now\b": "Please start speaking now.",
        r"\bYou can begin now\b": "You can begin now.",
    }

    for pattern, replacement in replacements.items():
        shaped = re.sub(pattern, replacement, shaped)

    shaped = re.sub(r"\.\s+(What|Why|How|Do|Did|Can|Could|Would|Is|Are)\b", r". \1", shaped)
    shaped = re.sub(r",\s*,", ", ", shaped)
    return shaped.strip()


async def synthesize_examiner_audio(
    text: str,
    *,
    voice: str | None = None,
) -> bytes:
    normalized = shape_examiner_text(text)
    api_key = (settings.openai_api_key or "").strip()
    openai_error: Exception | None = None
    edge_error: Exception | None = None
    gtts_error: Exception | None = None

    payload = {
        "model": _default_tts_model(),
        "voice": voice or _default_tts_voice(),
        "input": normalized,
        "instructions": _default_tts_instructions(),
        "response_format": "mp3",
        "speed": 0.93,
    }

    if api_key:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    OPENAI_AUDIO_SPEECH_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

            response.raise_for_status()
            return response.content
        except Exception as error:  # noqa: BLE001
            openai_error = error

    if edge_tts is not None:
        try:
            return await _synthesize_with_edge_tts(normalized)
        except Exception as error:  # noqa: BLE001
            edge_error = error

    if gTTS is not None:
        try:
            return await asyncio.to_thread(_synthesize_with_gtts, normalized)
        except Exception as error:  # noqa: BLE001
            gtts_error = error

    errors: list[str] = []
    if openai_error is not None:
        errors.append(f"openai={openai_error}")
    if edge_error is not None:
        errors.append(f"edge_tts={edge_error}")
    if gtts_error is not None:
        errors.append(f"gtts={gtts_error}")

    if errors:
        raise RuntimeError(
            "TTS synthesis failed across available providers: " + " | ".join(errors)
        ) from (gtts_error or edge_error or openai_error)

    raise RuntimeError("No TTS backend is available. Configure OPENAI_API_KEY or install edge-tts or gTTS.")


async def _synthesize_with_edge_tts(text: str) -> bytes:
    if edge_tts is None:
        raise RuntimeError("edge-tts is not installed.")

    chunks = bytearray()
    communicate = edge_tts.Communicate(
        text=text,
        voice=_default_edge_tts_voice(),
        rate="-6%",
        pitch="-2Hz",
    )
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio":
            chunks.extend(chunk["data"])

    if not chunks:
        raise RuntimeError("edge-tts returned no audio data.")

    return bytes(chunks)


def _synthesize_with_gtts(text: str) -> bytes:
    if gTTS is None:
        raise RuntimeError("gTTS is not installed.")
    buffer = BytesIO()
    gTTS(text=text, lang="en", tld="co.uk", slow=False).write_to_fp(buffer)
    return buffer.getvalue()
