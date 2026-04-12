# Exam Flow Documentation

This folder documents the implemented backend exam system.

## Scope
- Modules: `reading`, `listening`, `writing`, `speaking`, and `overall-exam` orchestration.
- API prefix: `/api/v1`.
- Timer unit: seconds.
- IELTS reporting bands: `.0` / `.5`.

## Files
- `01-lifecycle.md`: full attempt lifecycle including strict submit and draft save.
- `02-reading-listening-flow.md`: objective modules, answer normalization, scoring maps.
- `03-writing-flow.md`: weighted writing scoring and async evaluation path.
- `04-errors-and-pagination.md`: error contract and list/query behavior.
- `05-test-types.md`: supported task types.
- `06-endpoints-map.md`: public/admin endpoint map.

## See also
- `../assignments/README.md` for post-exam personalized training flow.
- `../ai/README.md` for AI summary generation/streaming after submit.
- `../dashboard/README.md` for student dashboard data contracts.
