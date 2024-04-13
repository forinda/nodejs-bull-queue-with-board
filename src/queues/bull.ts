import type {
  Job,
  Queue as QueueType,
  QueueOptions,
  DoneCallback,
  JobOptions,
} from "bull";
import Queue from "bull";

type QueueNames = "burger" | "pizza" | "hotdog";

type QueuePayloads = {
  [key in QueueNames]: key extends "burger"
    ? { name: string; type: "veggie" | "meat" | "plain" }
    : key extends "pizza"
    ? { name: string; type: "veggie" | "meat" | "cheese" }
    : key extends "hotdog"
    ? { name: "hotdog"; type: "veggie" | "meat" }
    : never;
};
export class BullQueue {
  private _name: QueueNames;
  private _queue: QueueType<QueuePayloads[QueueNames]>;
  protected processHandler: QueProcessor<QueueNames> | null = null;

  constructor(name: QueueNames, options: QueueOptions) {
    this._name = name;
    this._queue = new Queue(name, options);
  }

  get name() {
    return this._name;
  }

  get queue() {
    return this._queue;
  }
  /**
   *
   * @param payload The data passed to the queue
   * @returns
   */
  async addJob(payload: QueuePayloads[QueueNames], options?: JobOptions) {
    return await this.queue.add(payload, options);
  }
  /**
   *
   * @param processor  The processor function that will be called for each job
   * @param concurrency  The number of jobs that will be processed concurrently
   */
  async process(concurrency = 1) {
    // return await this.queue.process(concurrency, processor);
    if (!this.processHandler) {
      throw new Error("No processor registered for this queue");
    }
    return await this.queue.process(concurrency, this.processHandler);
  }

  registerProcessor(processor: QueProcessor<QueueNames>) {
    this.processHandler = processor;
    return this;
  }

  async getJobs(
    statuses: ("completed" | "waiting" | "active" | "delayed" | "failed")[]
  ) {
    return await this._queue.getJobs(statuses);
  }

  async getJob(jobId: string) {
    return await this._queue.getJob(jobId);
  }

  async getJobCounts() {
    return await this._queue.getJobCounts();
  }

  async getJobCountsByTypes() {
    return await this._queue.getJobCounts();
  }
}

// type MappedQueuesWithJobs = Map<QueueNames, Job<any>[]>;

type QueProcessor<T extends QueueNames> = (
  job: Job<QueuePayloads[T]>,
  done: DoneCallback
) => Promise<void>;

export class BullQueueManager {
  private static instance: BullQueueManager;
  private queues: Map<QueueNames, BullQueue> = new Map();
  private options: QueueOptions;

  constructor(options: QueueOptions) {
    this.options = options;
  }

  static getInstance(options: QueueOptions) {
    if (!BullQueueManager.instance) {
      BullQueueManager.instance = new BullQueueManager(options);
    }

    return BullQueueManager.instance;
  }

  registerQueue(queue: BullQueue) {
    if (this.queues.has(queue.name)) {
      throw new Error(`Queue ${queue.name} already exists`);
    }
    this.queues.set(queue.name, queue);
    return this;
  }

  getQueue(name: QueueNames) {
    return this.queues.get(name);
  }

  async processQueue<T extends QueueNames>(name: T, concurrency = 1) {
    const queue = this.queues.get(name);
    if (queue) {
      return await queue.process(concurrency);
    } else {
      throw new Error(`Queue ${name} not found`);
    }
  }

  async addJob<T extends QueueNames>(
    name: T,
    payload: QueuePayloads[T],
    options?: JobOptions
  ) {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }
    if (queue) {
      return await queue.addJob(payload, options);
    }
  }

  async getJobs<T extends QueueNames>(
    name: T,
    statuses: ("completed" | "waiting" | "active" | "delayed" | "failed")[]
  ) {
    const queue = this.queues.get(name);
    if (queue) {
      return await queue.getJobs(statuses);
    }
  }

  async getJob<T extends QueueNames>(name: T, jobId: string) {
    const queue = this.queues.get(name);
    if (queue) {
      return await queue.getJob(jobId);
    }
  }

  async getJobCounts<T extends QueueNames>(name: T) {
    const queue = this.queues.get(name);
    if (queue) {
      return await queue.getJobCounts();
    }
  }

  processAllQueues(
    concurrency: number = 1,
  ) {
    for (const [name, queue] of this.queues) {
      this.processQueue(name, concurrency).then(() => {
        console.log(`Processing queue ${name}`);
      });
    }
  }
}
