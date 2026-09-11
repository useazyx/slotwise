import { describe, expect, it } from "vitest"
import { QUEUE_NAMES, queue } from "../src/config/queue.js"
import { DAILY_AGENDA_CRON, scheduleRecurringJobs } from "../src/jobs/index.js"
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

  it("schedules the daily agenda every morning in the business timezone, without duplicating it", async () => {
    const app = await createTestApp()

    await scheduleRecurringJobs()
    await scheduleRecurringJobs()

    const schedules = await queue.getSchedules(QUEUE_NAMES.DAILY_AGENDA)
    expect(schedules).toHaveLength(1)
    expect(schedules[0]).toMatchObject({ cron: DAILY_AGENDA_CRON, timezone: "America/Sao_Paulo" })

    await app.close()
  })
})
