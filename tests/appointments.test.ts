import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { addDaysToDate, getWeekday, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("booking an appointment", () => {
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

  const nextWeek = () => addDaysToDate(getZonedDate(new Date(), TIME_ZONE), 7)
  const at = (date: string, time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return zonedDateTimeToUtc(date, hours * 60 + minutes, TIME_ZONE).toISOString()
  }

  // Prestador das 09:00 às 12:00 com um corte de 30 minutos a R$ 45
  async function setup(date: string) {
    const provider = await createUserAndLogin(app, { role: "PROVIDER", name: "Barbearia do Zé" })
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

    return { provider, service: service.json() }
  }

  const book = (token: string, payload: object) =>
    app.inject({ method: "POST", url: "/appointments", headers: authHeader(token), payload })

  it("books a free slot, copies the price and takes the slot off the list", async () => {
    const date = nextWeek()
    const { provider, service } = await setup(date)
    const client = await createUserAndLogin(app, { role: "CLIENT", name: "Ana" })

    const response = await book(client.token, {
      provider_id: provider.user.id,
      service_id: service.id,
      starts_at: at(date, "10:00"),
      notes: "Primeira vez",
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      status: "SCHEDULED",
      starts_at: at(date, "10:00"),
      ends_at: at(date, "10:30"),
      price_cents: 4500,
      notes: "Primeira vez",
      provider: { name: "Barbearia do Zé" },
      client: { name: "Ana" },
    })

    const slots = await app.inject({
      method: "GET",
      url: `/providers/${provider.user.id}/slots?service_id=${service.id}&date=${date}`,
    })
    const times = slots.json().slots.map((slot: { local_time: string }) => slot.local_time)
    expect(times).not.toContain("10:00")
    expect(times).not.toContain("09:45")
    expect(times).toContain("10:30")
  })

  it("lets only one of two simultaneous requests take the same slot", async () => {
    const date = nextWeek()
    const { provider, service } = await setup(date)
    const ana = await createUserAndLogin(app, { role: "CLIENT" })
    const bruno = await createUserAndLogin(app, { role: "CLIENT" })
    const payload = { provider_id: provider.user.id, service_id: service.id, starts_at: at(date, "11:00") }

    const responses = await Promise.all([book(ana.token, payload), book(bruno.token, payload)])

    const statuses = responses.map((response) => response.statusCode).sort()
    expect(statuses).toEqual([201, 409])
    expect(await prisma.appointment.count()).toBe(1)
  })

  it("refuses times that are not in the free slot list", async () => {
    const date = nextWeek()
    const { provider, service } = await setup(date)
    const client = await createUserAndLogin(app, { role: "CLIENT" })

    const offGrid = await book(client.token, {
      provider_id: provider.user.id,
      service_id: service.id,
      starts_at: at(date, "09:07"),
    })
    const afterHours = await book(client.token, {
      provider_id: provider.user.id,
      service_id: service.id,
      starts_at: at(date, "11:45"),
    })

    expect(offGrid.statusCode).toBe(409)
    expect(offGrid.json().error).toBe("SlotUnavailable")
    expect(afterHours.statusCode).toBe(409)
  })

  it("does not let providers book appointments", async () => {
    const date = nextWeek()
    const { provider, service } = await setup(date)

    const response = await book(provider.token, {
      provider_id: provider.user.id,
      service_id: service.id,
      starts_at: at(date, "10:00"),
    })

    expect(response.statusCode).toBe(403)
  })

  it("keeps the database itself from storing overlapping appointments", async () => {
    const date = nextWeek()
    const { provider, service } = await setup(date)
    const client = await createUserAndLogin(app, { role: "CLIENT" })
    const base = { client_id: client.user.id, provider_id: provider.user.id, service_id: service.id, price_cents: 0 }

    await prisma.appointment.create({
      data: { ...base, starts_at: at(date, "09:00"), ends_at: at(date, "10:00") },
    })

    // Inserindo direto no banco, sem passar pela API: a constraint barra
    await expect(
      prisma.appointment.create({ data: { ...base, starts_at: at(date, "09:30"), ends_at: at(date, "10:30") } })
    ).rejects.toThrow(/appointments_no_overlap/)

    // Cancelado não conta como ocupado
    await expect(
      prisma.appointment.create({
        data: { ...base, status: "CANCELED", starts_at: at(date, "09:30"), ends_at: at(date, "10:30") },
      })
    ).resolves.toBeDefined()
  })
})
