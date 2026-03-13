### Reorder Decision Algorithm

**Goal**: Avoid over-ordering while preventing stock-out during lead time.

### Definitions

- \( \text{avg\_daily\_consumption} \): mean of last \( N \) days of consumption.
- \( \text{expected\_consumption\_during\_lead} = \text{avg\_daily\_consumption} \times \text{lead\_time\_days} \).
- \( \text{safety\_stock} \): either product-specific or \( \text{safety\_multiplier} \times \text{avg\_daily\_consumption} \).
- \( \text{available} \): quantity available in inventory.
- \( \text{incoming} \): quantity in transit.

### Formula

\[
\text{need} = \left\lceil \text{expected\_consumption\_during\_lead} + \text{safety\_stock} - (\text{available} + \text{incoming}) \right\rceil
\]

\[
\text{reorder\_quantity} = \text{clamp}(\text{need}, \text{reorder\_min}, \text{reorder\_max})
\]

If \(\text{need} \le 0\), no reorder is triggered.

### Pseudocode

```text
function evaluate(product, inventory, history):
  historyN = last N days of history
  sum = total(historyN)
  avg = sum / max(1, len(historyN))
  expected = avg * product.lead_time_days
  safety = product.safety_stock > 0 ? product.safety_stock : avg * SAFETY_MULTIPLIER
  need = ceil(expected + safety - (inventory.available + inventory.in_transit))
  if need <= 0:
    return { shouldReorder: false }
  qty = clamp(need, product.reorder_min, product.reorder_max)
  return { shouldReorder: true, qty }
```

### Config Knobs

- `AVG_DAYS` default 30.
- `SAFETY_MULTIPLIER` default 2.
- Per-product `reorder_min`, `reorder_max`, `safety_stock`, `lead_time_days`.

### Example

- avg daily consumption: 10 units.
- lead time: 5 days.
- safety stock: 20 units.
- available: 30 units.
- in transit: 10 units.

\[
\text{expected} = 10 \times 5 = 50
\]
\[
\text{need} = \lceil 50 + 20 - (30 + 10) \rceil = \lceil 30 \rceil = 30
\]

If `reorder_min=10` and `reorder_max=100`, reorder quantity is 30.

