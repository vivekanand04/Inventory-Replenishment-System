import { createServer } from "http";
import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./logging";

const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  logger.info("Server started", { port: config.port });
});

