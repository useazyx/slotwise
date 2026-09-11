import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { addDaysToDate, getWeekday, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("appointment lifecycle", () => {
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
    return zonedDateTimeToUtc(date, hours * 60 + minutes, TIME_ZONE).toISOString()
  }

  // Prestador das 09:00 às 12:00, serviço de 30 min, e um cliente com horário marcado às 10:00
  async function setupWithBooking(date: string) {
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

    const booking = await bookAs(client.token, provider.user.id, service.json().id, at(date, "10:00"))

    return { provider, client, service: service.json(), appointment: booking.json() }
  }

  const bookAs = (token: string, providerId: string, serviceId: string, startsAt: string) =>
    app.inject({
      method: "POST",
      url: "/appointments",
      headers: authHeader(token),
      payload: { provider_id: providerId, service_id: serviceId, starts_at: startsAt },
    })

  describe("listing", () => {
    it("shows clients only their own appointments and providers everything they attend", async () => {
      const date = daysFromToday(5)
      const { provider, service } = await setupWithBooking(date)
      const otherClient = await createUserAndLogin(app, { role: "CLIENT" })
      await bookAs(otherClient.token, provider.user.id, service.id, at(date, "11:00"))

      const asOtherClient = await app.inject({
        method: "GET",
        url: "/appointments",
        headers: authHeader(otherClient.token),
      })
      const asProvider = await app.inject({ method: "GET", url: "/appointments", headers: authHeader(provider.token) })

      expect(asOtherClient.json().total).toBe(1)
      expect(asOtherClient.json().appointments[0].starts_at).toBe(at(date, "11:00"))
      expect(asProvider.json().total).toBe(2)
    })

    it("filters by status and period and paginates", async () => {
      const date = daysFromToday(5)
      const { provider, service } = await setupWithBooking(date)
      const otherClient = await createUserAndLogin(app, { role: "CLIENT" })
      await bookAs(otherClient.token, provider.user.id, service.id, at(date, "11:00"))
      const headers = authHeader(provider.token)

      const firstPage = await app.inject({ method: "GET", url: "/appointments?page_size=1", headers })
      const canceled = await app.inject({ method: "GET", url: "/appointments?status=CANCELED", headers })
      const otherDay = await app.inject({
        method: "GET",
        url: `/appointments?from=${addDaysToDate(date, 1)}&to=${addDaysToDate(date, 2)}`,
        headers,
      })
      const backwards = await app.inject({
        method: "GET",
        url: `/appointments?from=${date}&to=${addDaysToDate(date, -1)}`,
        headers,
      })

      expect(firstPage.json()).toMatchObject({ total: 2, current_page: 1, total_pages: 2 })
      expect(firstPage.json().appointments).toHaveLength(1)
      expect(canceled.json().total).toBe(0)
      expect(otherDay.json().total).toBe(0)
      expect(backwards.statusCode).toBe(400)
    })

    it("hides an appointment from people who are not part of it", async () => {
      const { appointment, client } = await setupWithBooking(daysFromToday(5))
      const stranger = await createUserAndLogin(app, { role: "CLIENT" })

      const asClient = await app.inject({
        method: "GET",
        url: `/appointments/${appointment.id}`,
        headers: authHeader(client.token),
      })
      const asStranger = await app.inject({
        method: "GET",
        url: `/appointments/${appointment.id}`,
        headers: authHeader(stranger.token),
      })

      expect(asClient.statusCode).toBe(200)
      expect(asStranger.statusCode).toBe(404)
    })
  })

  describe("canceling", () => {
    it("cancels, frees the slot and does not cancel twice", async () => {
      const date = daysFromToday(5)
      const { appointment, client, provider, service } = await setupWithBooking(date)
      const url = `/appointments/${appointment.id}/cancel`

      const first = await app.inject({
        method: "PATCH",
        url,
        headers: authHeader(client.token),
        payload: { reason: "Imprevisto" },
      })
      const second = await app.inject({ method: "PATCH", url, headers: authHeader(client.token), payload: {} })
      const slots = await app.inject({
        method: "GET",
        url: `/providers/${provider.user.id}/slots?service_id=${service.id}&date=${date}`,
      })

      expect(first.statusCode).toBe(200)
      expect(first.json()).toMatchObject({ status: "CANCELED", cancel_reason: "Imprevisto" })
      expect(first.json().canceled_at).toEqual(expect.any(String))
      expect(second.statusCode).toBe(409)
      expect(second.json().error).toBe("AppointmentNotActive")
      expect(slots.json().slots.map((slot: { local_time: string }) => slot.local_time)).toContain("10:00")
    })

    it("stops clients from canceling too close to the time, but not the provider", async () => {
      const date = daysFromToday(3)
      const { appointment, client, provider } = await setupWithBooking(date)
      const url = `/appointments/${appointment.id}/cancel`

      // Uma hora antes do horário das 10:00
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date(at(date, "09:00")))

      const byClient = await app.inject({ method: "PATCH", url, headers: authHeader(client.token) })
      const byProvider = await app.inject({ method: "PATCH", url, headers: authHeader(provider.token) })

      expect(byClient.statusCode).toBe(409)
      expect(byClient.json().error).toBe("TooLateToChange")
      expect(byProvider.statusCode).toBe(200)
    })
  })

  describe("rescheduling", () => {
    it("moves the appointment, even into a time that overlaps the old one, keeping the agreed price", async () => {
      const date = daysFromToday(5)
      const { appointment, client, provider, service } = await setupWithBooking(date)

      // O serviço ficou mais caro depois da marcação
      await app.inject({
        method: "PATCH",
        url: `/services/${service.id}`,
        headers: authHeader(provider.token),
        payload: { price_cents: 9900 },
      })

      const response = await app.inject({
        method: "PATCH",
        url: `/appointments/${appointment.id}/reschedule`,
        headers: authHeader(client.token),
        payload: { starts_at: at(date, "10:15") },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ status: "SCHEDULED", starts_at: at(date, "10:15"), price_cents: 4500 })

      const old = await prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } })
      expect(old.status).toBe("CANCELED")
      expect(old.cancel_reason).toBe("Remarcado pelo cliente")
    })

    it("refuses someone else's slot and the same time", async () => {
      const date = daysFromToday(5)
      const { appointment, client, provider, service } = await setupWithBooking(date)
      const otherClient = await createUserAndLogin(app, { role: "CLIENT" })
      await bookAs(otherClient.token, provider.user.id, service.id, at(date, "11:00"))
      const url = `/appointments/${appointment.id}/reschedule`

      const taken = await app.inject({
        method: "PATCH",
        url,
        headers: authHeader(client.token),
        payload: { starts_at: at(date, "11:00") },
      })
      const same = await app.inject({
        method: "PATCH",
        url,
        headers: authHeader(client.token),
        payload: { starts_at: at(date, "10:00") },
      })

      expect(taken.statusCode).toBe(409)
      expect(same.statusCode).toBe(400)
      expect(same.json().error).toBe("SameTime")
    })

    it("is only for the client who booked", async () => {
      const date = daysFromToday(5)
      const { appointment, provider } = await setupWithBooking(date)

      const response = await app.inject({
        method: "PATCH",
        url: `/appointments/${appointment.id}/reschedule`,
        headers: authHeader(provider.token),
        payload: { starts_at: at(date, "11:00") },
      })

      expect(response.statusCode).toBe(403)
    })
  })
})
