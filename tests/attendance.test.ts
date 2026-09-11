import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { addDaysToDate, getWeekday, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("attendance", () => {
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

  const at = (date: string, time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return zonedDateTimeToUtc(date, hours * 60 + minutes, TIME_ZONE)
  }

  // Um horário marcado às 10:00 daqui a 3 dias
  async function setupBooking() {
    const date = addDaysToDate(getZonedDate(new Date(), TIME_ZONE), 3)
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })
    const client = await createUserAndLogin(app, { role: "CLIENT" })
    const providerHeaders = authHeader(provider.token)

    const service = await app.inject({
      method: "POST",
      url: "/services",
      headers: providerHeaders,
      payload: { name: "Corte", duration_minutes: 30, price_cents: 4500 },
    })
    await app.inject({
      method: "PUT",
      url: "/availability",
      headers: providerHeaders,
      payload: { slots: [{ weekday: getWeekday(date), start: "09:00", end: "12:00" }] },
    })
    const booking = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: authHeader(client.token),
      payload: { provider_id: provider.user.id, service_id: service.json().id, starts_at: at(date, "10:00").toISOString() },
    })

    return { date, provider, client, appointment: booking.json() }
  }

  const markAs = (token: string, appointmentId: string, status: string) =>
    app.inject({
      method: "PATCH",
      url: `/appointments/${appointmentId}/attendance`,
      headers: authHeader(token),
      payload: { status },
    })

  it("lets the provider close the appointment once it has started", async () => {
    const { date, provider, appointment } = await setupBooking()

    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(at(date, "10:40"))

    const response = await markAs(provider.token, appointment.id, "NO_SHOW")

    expect(response.statusCode).toBe(200)
    expect(response.json().status).toBe("NO_SHOW")

    const again = await markAs(provider.token, appointment.id, "DONE")
    expect(again.statusCode).toBe(409)
    expect(again.json().error).toBe("AppointmentNotActive")
  })

  it("does not accept attendance before the appointment starts", async () => {
    const { provider, appointment } = await setupBooking()

    const response = await markAs(provider.token, appointment.id, "DONE")

    expect(response.statusCode).toBe(409)
    expect(response.json().error).toBe("AttendanceTooEarly")
  })

  it("is only for the provider of that appointment", async () => {
    const { client, appointment } = await setupBooking()
    const otherProvider = await createUserAndLogin(app, { role: "PROVIDER" })

    const byClient = await markAs(client.token, appointment.id, "DONE")
    const byOtherProvider = await markAs(otherProvider.token, appointment.id, "DONE")
    const invalidStatus = await markAs(otherProvider.token, appointment.id, "CANCELED")

    expect(byClient.statusCode).toBe(403)
    expect(byOtherProvider.statusCode).toBe(404)
    expect(invalidStatus.statusCode).toBe(400)
  })
})
