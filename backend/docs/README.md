# Bandnine Backend Docs

This directory contains product and technical documentation for backend domains.

## Domains
- `exams/` - lifecycle, strict submit/draft policy, scoring behavior, endpoint map.
- `assignments/` - post-exam error -> skill-gap -> assignment workflow.
- `ai/` - AI summaries, streaming, access model, teacher binding.
- `dashboard/` - split dashboard widgets backed by unified progress truth.

## Recommended reading order
1. `exams/README.md`
2. `assignments/README.md`
3. `ai/README.md`
4. `dashboard/README.md`

## API base
- Prefix: `/api/v1`
- Auth: `Authorization: Bearer <access_token>`

## Notes
- Time values are in seconds.
- Speaking is implemented with realtime + backend scoring + backend examiner decisions.
- IELTS reporting bands are normalized to `.0` / `.5`.
