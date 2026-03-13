import { startWorkers } from "../queues";
import { logger } from "../logging";

startWorkers();
logger.info("Workers started");

