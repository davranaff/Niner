# AI Summary Data Sources and Calculations

## Source tables used by summary generation
For each module, AI summary collects latest attempts from exam attempt tables only:
- Reading: `reading_exams`
- Listening: `listening_exams`
- Writing: `writing_exams`

Filter:
- `user_id = target user`
- `finished_at IS NOT NULL`
- Ordered by newest `finished_at DESC`
- Limited by `attempts_limit` (default 10)

## Important note
`user_progress` is not used as source for AI summary attempts.
So if user has progress rows but no finished exam attempts, summary will be generated with empty attempt data (`attempts=0`).

## Per-attempt metrics
Each attempt contributes these fields:
- `time_spent_seconds` = max(`finished_at - started_at`, 0)
- `time_limit_seconds` from test configuration
- `score`:
  - reading/listening: band from score map
  - writing: average of available part scores
- `mistakes` list from wrong answers/corrections

## Aggregate summary sections
Generator produces a structured payload with sections:
- `timing_analysis`
- `accuracy_analysis`
- `mistake_hotspots`
- `grammar_focus`
- `topic_focus`
- `improvement`
- `action_plan`
- `summary_text`

If attempts are empty, payload still returns all keys with safe fallback values and explanatory comments.
