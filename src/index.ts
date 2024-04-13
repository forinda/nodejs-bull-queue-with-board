import express from "express";
import { setupBullMqBoard } from "./queues/setup-bull-board";
import { BullQueue, BullQueueManager } from "./queues/bull";
import { promisify } from "util";

const sleep = promisify(setTimeout);
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});
const queues = BullQueueManager.getInstance({
  metrics: { maxDataPoints: 100 },
  redis: { port: 6379, host: "localhost" },
});
const queue = new BullQueue("burger", {
  redis: { port: 6379, host: "localhost" },
}).registerProcessor(async (job, done) => {
  console.log("Processing job ID:", job.id);
  await sleep(100);
  // job.progress(42);
  done();
});
queues.registerQueue(queue).processAllQueues(10);

app.post("/add-bugger", async (req, res) => {
  try {
    const jobsToAdd = { name: "burger", type: "meat" };
    Array.from({ length: 200 })
      .map(() => jobsToAdd)
      .forEach(async (j, index) => {
        await queues.addJob("burger", j as any, {
          delay: index % 2 == 0 ? 5000 : 0,
          removeOnComplete: true,
          attempts: 3,
        });
      });
    return res.sendStatus(200);
  } catch (error) {
    return res.sendStatus(500);
  }
});

setupBullMqBoard(app)([queue]);

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
