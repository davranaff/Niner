from decimal import Decimal

from app.modules.exams.score import listening_band_score, reading_band_score, round_band_to_half


def test_reading_band_score_edges() -> None:
    assert reading_band_score(39) == 9.0
    assert reading_band_score(37) == 8.5
    assert reading_band_score(35) == 8.0
    assert reading_band_score(30) == 7.0
    assert reading_band_score(23) == 6.0
    assert reading_band_score(13) == 4.5
    assert reading_band_score(4) == 2.5
    assert reading_band_score(0) == 0.0


def test_listening_band_score_edges() -> None:
    assert listening_band_score(39) == 9.0
    assert listening_band_score(37) == 8.5
    assert listening_band_score(32) == 7.5
    assert listening_band_score(30) == 7.0
    assert listening_band_score(26) == 6.5
    assert listening_band_score(18) == 5.5
    assert listening_band_score(4) == 2.5
    assert listening_band_score(0) == 0.0


def test_round_band_to_half_uses_ielts_steps() -> None:
    assert round_band_to_half(6.24) == 6.0
    assert round_band_to_half(6.25) == 6.5
    assert round_band_to_half(6.74) == 6.5
    assert round_band_to_half(6.75) == 7.0
    assert round_band_to_half(Decimal("7.25")) == 7.5
