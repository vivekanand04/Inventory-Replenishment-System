### Concurrency Controls

#### Reorder Evaluation

- Uses `pg_advisory_xact_lock(productId)` inside a single transaction.
- Prevents multiple reorder evaluations for the same product from running concurrently.
- `Reorder` table enforces idempotency via `idempotency_key` and `(productId, time_bucket)` index.

#### Inventory Updates

- Inventory changes occur inside serializable transactions.
- Negative inventory is rejected.
- Consumption records and inventory updates are committed atomically.

#### Alternative Patterns

- Row-level `SELECT FOR UPDATE` on inventory rows.
- Optimistic concurrency via version numbers.

#### Load Testing

- `pnpm simulate:concurrency` sends parallel consumption requests.
- Expected behavior is that inventory never becomes negative and at most one reorder is created per time bucket.

