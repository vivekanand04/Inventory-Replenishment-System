### Alert Workflow

```mermaid
flowchart TD
  Event[Inventory or PO Event] --> AlertSvc[AlertService]
  AlertSvc --> AlertRow[Alert row in DB]
  AlertRow --> Notif[Notification Stub]
```

### Rules

- Critical alerts for out-of-stock transitions.
- Info alerts for stock receipts.
- Future integrations can send email or webhooks from `AlertService.sendNotification`.

