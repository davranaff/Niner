# Bandnine Backend Docs

This directory contains product and technical documentation for backend domains.

## Domains
- `exams/` - exam lifecycle, task formats, endpoint map, errors.
- `ai/` - AI summaries, streaming, teacher-student access model.
- `dashboard/` - split dashboard endpoints and response contracts.

## Recommended reading order
1. `exams/README.md`
2. `ai/README.md`
3. `dashboard/README.md`

## API base
- Prefix: `/api/v1`
- Auth: `Authorization: Bearer <access_token>`

## Notes
- Time fields in exam flow are in seconds.
- Speaking module is not implemented in v1.
