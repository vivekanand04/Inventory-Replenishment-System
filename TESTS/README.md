### Tests And Concurrency Simulation

- **Unit tests**: `pnpm --filter backend test`
- **Integration tests**: add Supertest-based tests under `packages/backend/src/__tests__`.
- **Concurrency simulation**:
  - Command: `pnpm simulate:concurrency`
  - Env:
    - `SIM_PRODUCT_ID` product id to test.
    - `SIM_CONCURRENCY` number of concurrent sales.
  - Expected:
    - All HTTP calls succeed.
    - Inventory does not become negative.
    - At most one reorder per product per time bucket.

