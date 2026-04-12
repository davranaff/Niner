import pytest

from app.db.models import (
    ListeningPart,
    ListeningQuestion,
    ListeningQuestionBlock,
    ListeningQuestionOption,
    ListeningTest,
    ReadingPassage,
    ReadingQuestion,
    ReadingQuestionBlock,
    ReadingQuestionOption,
    ReadingTest,
    WritingPart,
    WritingTest,
)


@pytest.mark.asyncio
async def test_reading_listening_writing_detail_response_shapes(client, db_session):
    reading_test = ReadingTest(
        title="Reading Detail",
        description="Desc",
        time_limit=3600,
        total_questions=2,
        is_active=True,
    )
    db_session.add(reading_test)
    await db_session.flush()

    reading_passage = ReadingPassage(
        test_id=reading_test.id,
        title="Passage 1",
        content="Passage content",
        passage_number=1,
    )
    db_session.add(reading_passage)
    await db_session.flush()

    reading_radio_block = ReadingQuestionBlock(
        passage_id=reading_passage.id,
        title="TFNG",
        description="Choose True, False or Not Given",
        block_type="true_false_ng",
        order=1,
    )
    db_session.add(reading_radio_block)
    await db_session.flush()

    reading_radio_question = ReadingQuestion(
        question_block_id=reading_radio_block.id,
        question_text="Statement 1",
        order=1,
    )
    db_session.add(reading_radio_question)
    await db_session.flush()
    db_session.add_all(
        [
            ReadingQuestionOption(
                question_id=reading_radio_question.id,
                option_text="True",
                is_correct=True,
                order=1,
            ),
            ReadingQuestionOption(
                question_id=reading_radio_question.id,
                option_text="False",
                is_correct=False,
                order=2,
            ),
            ReadingQuestionOption(
                question_id=reading_radio_question.id,
                option_text="Not Given",
                is_correct=False,
                order=3,
            ),
        ]
    )

    reading_table_block = ReadingQuestionBlock(
        passage_id=reading_passage.id,
        title="Table",
        description="Choose NO MORE THAN TWO WORDS from passage",
        block_type="table_completion",
        order=2,
        table_json={"header": ["A"], "rows": [["Q2"]]},
    )
    db_session.add(reading_table_block)
    await db_session.flush()
    db_session.add(
        ReadingQuestion(
            question_block_id=reading_table_block.id,
            question_text="Q2",
            order=1,
        )
    )

    listening_test = ListeningTest(
        title="Listening Detail",
        description="Desc",
        time_limit=1800,
        total_questions=2,
        is_active=True,
        voice_url="https://example.com/audio.mp3",
    )
    db_session.add(listening_test)
    await db_session.flush()

    listening_part_1 = ListeningPart(test_id=listening_test.id, title="Part 1", order=1)
    listening_part_2 = ListeningPart(test_id=listening_test.id, title="Part 2", order=2)
    db_session.add_all([listening_part_1, listening_part_2])
    await db_session.flush()

    listening_mc_block = ListeningQuestionBlock(
        part_id=listening_part_1.id,
        title="MCQ",
        description="Choose one option",
        block_type="multiple_choice",
        order=1,
    )
    db_session.add(listening_mc_block)
    await db_session.flush()
    listening_mc_question = ListeningQuestion(
        question_block_id=listening_mc_block.id,
        question_text="Q1",
        order=1,
    )
    db_session.add(listening_mc_question)
    await db_session.flush()
    db_session.add_all(
        [
            ListeningQuestionOption(
                question_id=listening_mc_question.id,
                option_text="A",
                is_correct=True,
                order=1,
            ),
            ListeningQuestionOption(
                question_id=listening_mc_question.id,
                option_text="B",
                is_correct=False,
                order=2,
            ),
        ]
    )

    listening_table_block = ListeningQuestionBlock(
        part_id=listening_part_2.id,
        title="Table",
        description="Write ONE WORD ONLY",
        block_type="table_completion",
        order=1,
        table_json={"header": ["B"], "rows": [["Q2"]]},
    )
    db_session.add(listening_table_block)
    await db_session.flush()
    db_session.add(
        ListeningQuestion(
            question_block_id=listening_table_block.id,
            question_text="Q2",
            order=1,
        )
    )

    writing_test = WritingTest(
        title="Writing Detail",
        description="Desc",
        time_limit=3600,
        is_active=True,
    )
    db_session.add(writing_test)
    await db_session.flush()
    db_session.add(
        WritingPart(
            test_id=writing_test.id,
            order=1,
            task="Describe the graph",
            image_url="https://example.com/graph.png",
            file_urls=["https://example.com/prompt.pdf"],
        )
    )
    await db_session.commit()

    reading_response = await client.get(f"/api/v1/reading/tests/{reading_test.id}")
    assert reading_response.status_code == 200
    reading_payload = reading_response.json()
    assert reading_payload["time_limit"] == 3600
    assert reading_payload["parts"]
    assert reading_payload["passages"]
    assert reading_payload["parts"][0]["part_number"] == 1
    assert reading_payload["parts"][0]["questions_count"] == 2

    radio_block = reading_payload["parts"][0]["question_blocks"][0]
    assert radio_block["answer_spec"]["answer_type"] == "single_choice"
    assert radio_block["answer_spec"]["input_variant"] == "radio"
    assert radio_block["questions"][0]["options"]

    table_block = reading_payload["parts"][0]["question_blocks"][1]
    assert table_block["answer_spec"]["answer_type"] == "text_input"
    assert table_block["answer_spec"]["input_variant"] == "table_blank"
    assert table_block["answer_spec"]["max_words"] == 2
    assert table_block["table_json"] == {"header": ["A"], "rows": [["Q2"]]}

    listening_response = await client.get(f"/api/v1/listening/tests/{listening_test.id}")
    assert listening_response.status_code == 200
    listening_payload = listening_response.json()
    assert listening_payload["time_limit"] == 1800
    assert listening_payload["voice_url"] == "https://example.com/audio.mp3"
    assert listening_payload["audio_url"] == "https://example.com/audio.mp3"
    assert len(listening_payload["parts"]) == 2
    assert listening_payload["parts"][0]["part_number"] == 1

    listening_mc = listening_payload["parts"][0]["question_blocks"][0]
    assert listening_mc["answer_spec"]["answer_type"] == "single_choice"
    assert listening_mc["answer_spec"]["input_variant"] == "radio"
    assert listening_mc["questions"][0]["options"]
    assert "is_correct" not in listening_mc["questions"][0]["options"][0]

    listening_table = listening_payload["parts"][1]["question_blocks"][0]
    assert listening_table["answer_spec"]["answer_type"] == "text_input"
    assert listening_table["answer_spec"]["input_variant"] == "table_blank"
    assert listening_table["answer_spec"]["max_words"] == 1

    writing_response = await client.get(f"/api/v1/writing/tests/{writing_test.id}")
    assert writing_response.status_code == 200
    writing_payload = writing_response.json()
    assert writing_payload["time_limit"] == 3600
    assert writing_payload["parts"]
    assert writing_payload["writing_parts"]

    writing_part = writing_payload["parts"][0]
    assert writing_part["prompt"]["text"] == "Describe the graph"
    assert writing_part["prompt"]["image_urls"] == ["https://example.com/graph.png"]
    assert writing_part["prompt"]["file_urls"] == ["https://example.com/prompt.pdf"]
    assert writing_part["answer_spec"]["answer_type"] == "text_input"
    assert writing_part["answer_spec"]["input_variant"] == "essay"
