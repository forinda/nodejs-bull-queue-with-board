import { ExpressAdapter } from "@bull-board/express";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { createBullBoard } from "@bull-board/api";
import Queue from "bull";
import { Application, Router } from "express";
import { BullQueue } from "./bull";
type QueueNames = "burger" | "pizza" | "hotdog";
export function setupBullMqBoard(app: Application) {
  return (queueList: BullQueue[]) => {
    // Create a new queue with the Redis connection options
    // const router = Router();
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/admin/queues");

    const queues = queueList.map((q) => new BullAdapter(q.queue));
    const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard(
      {
        queues,
        // options: {},
        serverAdapter: serverAdapter,
      }
    );
    app.use("/admin/queues", serverAdapter.getRouter());
  };
}
