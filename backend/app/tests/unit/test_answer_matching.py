from app.modules.exams.service import _match_answer


def test_match_answer_trim_and_case_insensitive() -> None:
    assert _match_answer("  AnSwEr ", ["answer", "something"])
    assert _match_answer("YES", ["no", "yes"])
    assert not _match_answer("incorrect", ["correct"])


def test_match_answer_normalizes_articles_and_punctuation() -> None:
    assert _match_answer("The River.", ["river"])
    assert _match_answer("A schedule", ["the schedule"])
    assert _match_answer("internet", ["internet / web"])
    assert _match_answer("web", ["internet / web"])
