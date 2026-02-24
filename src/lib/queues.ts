/**
 * Centralised BullMQ queue name constants.
 *
 * All Queue() and Worker() instantiations MUST reference these constants.
 * Never use hardcoded queue name strings — mismatches silently drop jobs.
 */
export const QUEUE_NAMES = {
  /** Main purchase-task execution queue. Workers in TaskExecutor / TaskWorker. */
  TASK_EXECUTION: "task-execution",

  /** Per-product availability monitoring queue. Worker in MonitoringWorker. */
  MONITORING: "monitoring-queue",

  /** Product scraping / data-import queue. Worker in TaskExecutor (scraping). */
  SCRAPING: "product-scraping",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
