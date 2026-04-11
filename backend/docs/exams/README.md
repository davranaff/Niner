# Exam Flow Documentation

This folder contains product-level documentation for the backend exam system.

Scope:
- Module family: `reading`, `listening`, `writing`, and `exams`.
- API prefix: `/api/v1`.
- Timer unit: seconds.
- Speaking is not implemented yet.

Files:
- `01-lifecycle.md`: full lifecycle of an exam attempt.
- `02-reading-listening-flow.md`: catalog and submit behavior for reading/listening.
- `03-writing-flow.md`: writing submit, AI feedback, and manual review flow.
- `04-errors-and-pagination.md`: error contract and pagination contract.
- `05-test-types.md`: all supported task types in reading/listening/writing.
- `06-endpoints-map.md`: public/admin endpoint map for exam domain.

See also:
- `../ai/README.md` for AI summary generation/streaming after submit.
- `../dashboard/README.md` for student dashboard widgets built on exam data.
