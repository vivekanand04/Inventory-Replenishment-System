### Failure And Rollback Strategy

#### Purchase Order Creation Failures

- Reorder evaluation marks records as `TRIGGERED`.
- BullMQ `purchaseOrderQueue` creates purchase orders.
- On failures, jobs are retried with backoff.
- Reorder remains `TRIGGERED` until a purchase order is created and linked.

#### Supplier Delays And Partial Receipts

- `applyReceipt` updates `PurchaseOrder.status` to `PARTIAL` or `RECEIVED`.
- Inventory updates and state transitions happen inside transactions.
- Alerts are generated for partial receipts and delays.

#### Transaction Safety

- All inventory-affecting logic uses Prisma transactions.
- Reorder evaluation uses Postgres advisory transaction locks to prevent duplicates.

#### Idempotent Webhooks

- Supplier webhooks store external IDs in `ProcessedWebhook`.
- Duplicate webhook IDs are ignored.

