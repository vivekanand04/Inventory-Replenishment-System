import { randomUUID } from "crypto";
import axios from "axios";

const baseUrl = process.env.BASE_URL || "http://localhost:4000";

const simulate = async () => {
  const productId = Number(process.env.SIM_PRODUCT_ID || "1");
  const n = Number(process.env.SIM_CONCURRENCY || "10");
  const promises = [];
  for (let i = 0; i < n; i += 1) {
    promises.push(
      axios.post(`${baseUrl}/api/consumption`, {
        productId,
        qty: 1,
        type: "SALE",
        reference: randomUUID()
      })
    );
  }
  try {
    await Promise.all(promises);
    // eslint-disable-next-line no-console
    console.log("Concurrency simulation completed");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Concurrency simulation failed", e);
  }
};

simulate();

