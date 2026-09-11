import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_BOOKING_DAYS_AHEAD } from "../src/config/bookingRules.js"
import { prisma } from "../src/config/prisma.js"
import { addDaysToDate, getWeekday, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("available slots", () => {
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

  // Prestador que atende das 09:00 às 12:00 no dia da semana da data, com um serviço de 1 hora
  async function setupProvider(date: string) {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })
    const client = await createUserAndLogin(app, { role: "CLIENT" })
    const headers = authHeader(provider.token)

    const service = await app.inject({
      method: "POST",
      url: "/services",
      headers,
      payload: { name: "Massagem", duration_minutes: 60, price_cents: 12000 },
    })
    await app.inject({
      method: "PUT",
      url: "/availability",
      headers,
      payload: { slots: [{ weekday: getWeekday(date), start: "09:00", end: "12:00" }] },
    })

    return { provider, client, service: service.json() }
  }

  const getSlots = (providerId: string, serviceId: string, date: string) =>
    app.inject({ method: "GET", url: `/providers/${providerId}/slots?service_id=${serviceId}&date=${date}` })

  const localTimes = (body: { slots: { local_time: string }[] }) => body.slots.map((slot) => slot.local_time)

  const nextWeek = () => addDaysToDate(getZonedDate(new Date(), TIME_ZONE), 7)

  it("slices the working hours in 15 minute steps where the whole service fits", async () => {
    const date = nextWeek()
    const { provider, service } = await setupProvider(date)

    const response = await getSlots(provider.user.id, service.id, date)

    expect(response.statusCode).toBe(200)
    expect(localTimes(response.json())).toEqual([
      "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00",
    ])
    // 09:00 em São Paulo é 12:00 em UTC
    expect(response.json().slots[0].starts_at).toBe(zonedDateTimeToUtc(date, 540, TIME_ZONE).toISOString())
  })

  it("removes slots that overlap a scheduled appointment, but not a canceled one", async () => {
    const date = nextWeek()
    const { provider, client, service } = await setupProvider(date)
    const base = { client_id: client.user.id, provider_id: provider.user.id, service_id: service.id, price_cents: 0 }

    await prisma.appointment.createMany({
      data: [
        {
          ...base,
          starts_at: zonedDateTimeToUtc(date, 600, TIME_ZONE),
          ends_at: zonedDateTimeToUtc(date, 630, TIME_ZONE),
        },
        {
          ...base,
          status: "CANCELED",
          starts_at: zonedDateTimeToUtc(date, 660, TIME_ZONE),
          ends_at: zonedDateTimeToUtc(date, 720, TIME_ZONE),
        },
      ],
    })

    const response = await getSlots(provider.user.id, service.id, date)

    // 10:00-10:30 está ocupado: 09:00 encosta e fica, 09:15 até 10:15 cruzam e saem
    expect(localTimes(response.json())).toEqual(["09:00", "10:30", "10:45", "11:00"])
  })

  it("hides slots that are in the past or too close to now", async () => {
    const date = nextWeek()
    const { provider, service } = await setupProvider(date)

    // Finge que agora são 09:40 daquele dia: com 30 min de antecedência, o primeiro horário é 10:15
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(zonedDateTimeToUtc(date, 9 * 60 + 40, TIME_ZONE))

    const response = await getSlots(provider.user.id, service.id, date)

    expect(localTimes(response.json())).toEqual(["10:15", "10:30", "10:45", "11:00"])
  })

  it("returns an empty list on a day without working hours", async () => {
    const date = nextWeek()
    const { provider, service } = await setupProvider(date)

    const response = await getSlots(provider.user.id, service.id, addDaysToDate(date, 1))

    expect(response.statusCode).toBe(200)
    expect(response.json().slots).toEqual([])
  })

  it("refuses dates beyond the booking window and dates that do not exist", async () => {
    const date = nextWeek()
    const { provider, service } = await setupProvider(date)
    const today = getZonedDate(new Date(), TIME_ZONE)

    const tooFar = await getSlots(provider.user.id, service.id, addDaysToDate(today, MAX_BOOKING_DAYS_AHEAD + 1))
    const impossible = await getSlots(provider.user.id, service.id, "2026-02-30")

    expect(tooFar.statusCode).toBe(400)
    expect(tooFar.json().error).toBe("DateTooFarAhead")
    expect(impossible.statusCode).toBe(400)
    expect(impossible.json().error).toBe("ValidationError")
  })

  it("does not build slots with another provider's service", async () => {
    const date = nextWeek()
    const { service } = await setupProvider(date)
    const other = await setupProvider(date)

    const response = await getSlots(other.provider.user.id, service.id, date)

    expect(response.statusCode).toBe(404)
    expect(response.json().error).toBe("ServiceNotFound")
  })
})
