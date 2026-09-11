import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { QUEUE_NAMES, queue } from "../src/config/queue.js"
import { handleReminderJobs } from "../src/jobs/reminderWorker.js"
import { SendReminderService } from "../src/services/reminders/SendReminderService.js"
import { addDaysToDate, getWeekday, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("appointment reminders", () => {
  let app: TestApp

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const daysFromToday = (days: number) => addDaysToDate(getZonedDate(new Date(), TIME_ZONE), days)
  const at = (date: string, time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return zonedDateTimeToUtc(date, hours * 60 + minutes, TIME_ZONE)
  }

  // Prestador das 09:00 às 12:00 no dia da semana da data, com um corte de 30 minutos
  async function setup(date: string) {
    const provider = await createUserAndLogin(app, { role: "PROVIDER", name: "Barbearia do Zé" })
    const client = await createUserAndLogin(app, { role: "CLIENT", name: "Ana Souza" })
    const headers = authHeader(provider.token)

    const service = await app.inject({
      method: "POST",
      url: "/services",
      headers,
      payload: { name: "Corte", duration_minutes: 30, price_cents: 4500 },
    })
    await app.inject({
      method: "PUT",
      url: "/availability",
      headers,
      payload: { slots: [{ weekday: getWeekday(date), start: "09:00", end: "12:00" }] },
    })

    return { provider, client, service: service.json() }
  }

  async function book(setupData: Awaited<ReturnType<typeof setup>>, startsAt: Date) {
    const response = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: authHeader(setupData.client.token),
      payload: {
        provider_id: setupData.provider.user.id,
        service_id: setupData.service.id,
        starts_at: startsAt.toISOString(),
      },
    })
    return response.json()
  }

  it("schedules a reminder 24 hours and 1 hour before, each as a delayed job", async () => {
    const date = daysFromToday(5)
    const data = await setup(date)
    const startsAt = at(date, "10:00")

    const appointment = await book(data, startsAt)
    const reminders = await prisma.reminder.findMany({
      where: { appointment_id: appointment.id },
      orderBy: { scheduled_for: "asc" },
    })

    expect(reminders.map((reminder) => reminder.kind)).toEqual(["DAY_BEFORE", "HOUR_BEFORE"])
    expect(reminders[0].scheduled_for.getTime()).toBe(startsAt.getTime() - 24 * 60 * 60_000)
    expect(reminders[1].scheduled_for.getTime()).toBe(startsAt.getTime() - 60 * 60_000)

    const job = await queue.getJobById(QUEUE_NAMES.REMINDERS, reminders[0].job_id as string)
    expect(job).toMatchObject({ state: "created", data: { reminder_id: reminders[0].id } })
    expect(job?.startAfter.getTime()).toBe(reminders[0].scheduled_for.getTime())
  })

  it("skips the day-before reminder when the appointment is less than 24 hours away", async () => {
    const date = daysFromToday(3)
    const data = await setup(date)

    // Finge que agora é meio-dia da véspera: o horário das 10:00 está a 22 horas
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(at(addDaysToDate(date, -1), "12:00"))

    const appointment = await book(data, at(date, "10:00"))
    const kinds = (await prisma.reminder.findMany({ where: { appointment_id: appointment.id } })).map((r) => r.kind)

    expect(kinds).toEqual(["HOUR_BEFORE"])
  })

  it("cancels pending reminders and their jobs when the appointment is canceled", async () => {
    const date = daysFromToday(5)
    const data = await setup(date)
    const appointment = await book(data, at(date, "10:00"))

    await app.inject({
      method: "PATCH",
      url: `/appointments/${appointment.id}/cancel`,
      headers: authHeader(data.client.token),
    })

    const reminders = await prisma.reminder.findMany({ where: { appointment_id: appointment.id } })
    expect(reminders.map((reminder) => reminder.status)).toEqual(["CANCELED", "CANCELED"])

    const job = await queue.getJobById(QUEUE_NAMES.REMINDERS, reminders[0].job_id as string)
    expect(job?.state).toBe("cancelled")
  })

  it("moves the reminders to the new time when rescheduling", async () => {
    const date = daysFromToday(5)
    const data = await setup(date)
    const appointment = await book(data, at(date, "10:00"))

    const rescheduled = await app.inject({
      method: "PATCH",
      url: `/appointments/${appointment.id}/reschedule`,
      headers: authHeader(data.client.token),
      payload: { starts_at: at(date, "11:00").toISOString() },
    })

    const oldStatuses = (await prisma.reminder.findMany({ where: { appointment_id: appointment.id } })).map(
      (reminder) => reminder.status
    )
    const newReminders = await prisma.reminder.findMany({ where: { appointment_id: rescheduled.json().id } })

    expect(oldStatuses).toEqual(["CANCELED", "CANCELED"])
    expect(newReminders).toHaveLength(2)
    expect(newReminders.every((reminder) => reminder.status === "PENDING")).toBe(true)
  })

  it("sends a pending reminder once, with a friendly message", async () => {
    const date = daysFromToday(5)
    const data = await setup(date)
    const appointment = await book(data, at(date, "10:00"))
    const reminder = await prisma.reminder.findFirstOrThrow({
      where: { appointment_id: appointment.id, kind: "DAY_BEFORE" },
    })

    const first = await new SendReminderService().execute(reminder.id)
    const second = await new SendReminderService().execute(reminder.id)

    const [, month, day] = date.split("-")
    expect(first).toEqual({
      sent: true,
      message: `Oi, Ana! Lembrete: Corte com Barbearia do Zé amanhã (${day}/${month}) às 10:00.`,
    })
    expect(second).toEqual({ sent: false })

    const saved = await prisma.reminder.findUniqueOrThrow({ where: { id: reminder.id } })
    expect(saved.status).toBe("SENT")
    expect(saved.sent_at).toBeInstanceOf(Date)
  })

  it("does not send a reminder for an appointment that is no longer scheduled", async () => {
    const date = daysFromToday(5)
    const data = await setup(date)
    const appointment = await book(data, at(date, "10:00"))
    const reminders = await prisma.reminder.findMany({ where: { appointment_id: appointment.id } })

    // Cancelado direto no banco, sem passar pela API (os lembretes continuam PENDING)
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELED" } })

    await handleReminderJobs(
      reminders.map((reminder) => ({ data: { reminder_id: reminder.id } }) as Parameters<typeof handleReminderJobs>[0][0])
    )

    const statuses = (await prisma.reminder.findMany({ where: { appointment_id: appointment.id } })).map(
      (reminder) => reminder.status
    )
    expect(statuses).toEqual(["CANCELED", "CANCELED"])
  })
})
