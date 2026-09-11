import { describe, expect, it } from "vitest"
import { QUEUE_NAMES, queue } from "../src/config/queue.js"
import { createTestApp } from "./helpers.js"

describe("job queue", () => {
  it("starts with the API and creates the queues with their retry policy", async () => {
    const app = await createTestApp()

    const reminders = await queue.getQueue(QUEUE_NAMES.REMINDERS)
    const dailyAgenda = await queue.getQueue(QUEUE_NAMES.DAILY_AGENDA)

    expect(reminders).toMatchObject({ name: QUEUE_NAMES.REMINDERS, retryLimit: 5, retryBackoff: true })
    expect(dailyAgenda).toMatchObject({ name: QUEUE_NAMES.DAILY_AGENDA })

    await app.close()
  })
})
