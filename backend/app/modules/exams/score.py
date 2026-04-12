from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

BandThreshold = tuple[int, float]

READING_BAND_THRESHOLDS: tuple[BandThreshold, ...] = (
    (39, 9.0),
    (37, 8.5),
    (35, 8.0),
    (33, 7.5),
    (30, 7.0),
    (27, 6.5),
    (23, 6.0),
    (19, 5.5),
    (15, 5.0),
    (13, 4.5),
    (10, 4.0),
    (8, 3.5),
    (6, 3.0),
    (4, 2.5),
)

LISTENING_BAND_THRESHOLDS: tuple[BandThreshold, ...] = (
    (39, 9.0),
    (37, 8.5),
    (35, 8.0),
    (32, 7.5),
    (30, 7.0),
    (26, 6.5),
    (23, 6.0),
    (18, 5.5),
    (16, 5.0),
    (13, 4.5),
    (10, 4.0),
    (8, 3.5),
    (6, 3.0),
    (4, 2.5),
)


def round_band_to_half(value: Decimal | float | int) -> float:
    band = Decimal(str(value))
    doubled = (band * Decimal("2")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    rounded = (doubled / Decimal("2")).quantize(Decimal("0.0"))
    return float(rounded)


def _band_from_thresholds(raw_score: int, thresholds: tuple[BandThreshold, ...]) -> float:
    for min_score, band in thresholds:
        if raw_score >= min_score:
            return band
    return 0.0


def reading_band_score(raw_score: int) -> float:
    return _band_from_thresholds(raw_score, READING_BAND_THRESHOLDS)


def listening_band_score(raw_score: int) -> float:
    return _band_from_thresholds(raw_score, LISTENING_BAND_THRESHOLDS)
