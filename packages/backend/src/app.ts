import "express-async-errors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { json } from "body-parser";
import { correlationIdMiddleware } from "./logging";
import { productRouter } from "./routes/products";
import { consumptionRouter } from "./routes/consumption";
import { reorderRouter } from "./routes/reorders";
import { purchaseOrderRouter } from "./routes/purchaseOrders";
import { webhookRouter } from "./routes/webhooks";
import { auditRouter } from "./routes/audit";

export const createApp = (): express.Express => {
  const app = express();
  app.use(helmet());
  app.use(json());
  app.use(morgan("combined"));
  app.use(correlationIdMiddleware);

  app.use("/api/products", productRouter);
  app.use("/api/consumption", consumptionRouter);
  app.use("/api/reorders", reorderRouter);
  app.use("/api/purchase-orders", purchaseOrderRouter);
  app.use("/api/webhooks", webhookRouter);
  app.use("/api/audit", auditRouter);

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
};

