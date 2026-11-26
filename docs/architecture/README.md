# Architecture documents

Cross-cutting technical conventions that every feature follows. Feature PRDs and ERDs (`docs/features/`) say what a feature does. The business rules (`docs/business/business-rules.md`) say what must hold for the business. These documents say **how the code does it**, so new features reuse the same patterns instead of re-deriving them.

| Document | Covers |
| --- | --- |
| [api-conventions.md](api-conventions.md) | Versioning, route prefixes, authentication versus authorization, error shape and codes, pagination, filters and sorting, public IDs, optimistic concurrency, rate limits |
| [tenancy.md](tenancy.md) | How a request identifies its company, the `company.member` middleware, isolation rules, platform (cross-tenant) routes, tenant-owned tables, isolation tests |
| [audit-logging.md](audit-logging.md) | When to audit, `AuditLogger`, transactions, action names, metadata, company scoping |

## When to add or update

- **Update** a document in the same piece of work that changes the convention it describes, for example a new error code, a new pagination parameter or a new tenant middleware.
- **Add** a document when a decision affects more than one feature and doesn't belong to any single one, for example caching, file storage or background jobs.
- Keep them short and concrete. Describe what the code does and point to the files that implement it. A rule that is about the business (not the implementation) belongs in the business rules instead.
- If code and document disagree, fix one of them. Don't leave the conflict.
