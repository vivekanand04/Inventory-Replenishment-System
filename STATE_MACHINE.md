### Inventory State Machine

```mermaid
stateDiagram-v2
  [*] --> OUT_OF_STOCK
  OUT_OF_STOCK --> IN_STOCK: stock received
  IN_STOCK --> LOW_STOCK: below reorder_level
  LOW_STOCK --> REORDER_TRIGGERED: reorder created
  REORDER_TRIGGERED --> IN_TRANSIT: purchase order created
  IN_TRANSIT --> RECEIVED: goods received
  RECEIVED --> IN_STOCK
  IN_STOCK --> OUT_OF_STOCK: consumption
  IN_STOCK --> BLOCKED: blocked quantity set
  BLOCKED --> IN_STOCK: unblocked
```

### Enforcement

- Inventory rows persist a `state` field.
- All inventory mutations compute next state based on quantities and blocked amount.
- `InventoryStateHistory` stores `(from_state, to_state, changed_at, meta)` for each transition.

### Rules

- Negative inventory is rejected.
- State transitions are only applied inside database transactions.

