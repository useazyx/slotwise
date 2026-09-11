import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { BuildDailyAgendaService } from "../src/services/agenda/BuildDailyAgendaService.js"
import { addDaysToDate, getZonedDate, zonedDateTimeToUtc } from "../src/utils/timezone.js"
import { createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const TIME_ZONE = "America/Sao_Paulo"

describe("daily agenda", () => {
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

  const at = (date: string, time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return zonedDateTimeToUtc(date, hours * 60 + minutes, TIME_ZONE)
  }

  it("groups the day's scheduled appointments by provider in time order", async () => {
    const date = addDaysToDate(getZonedDate(new Date(), TIME_ZONE), 2)
    const barber = await createUserAndLogin(app, { role: "PROVIDER", name: "Barbearia do Zé" })
    const nails = await createUserAndLogin(app, { role: "PROVIDER", name: "Studio Bela" })
    const ana = await createUserAndLogin(app, { role: "CLIENT", name: "Ana" })
    const bruno = await createUserAndLogin(app, { role: "CLIENT", name: "Bruno" })

    const haircut = await prisma.service.create({
      data: { provider_id: barber.user.id, name: "Corte", duration_minutes: 30, price_cents: 4500 },
    })
    const manicure = await prisma.service.create({
      data: { provider_id: nails.user.id, name: "Manicure", duration_minutes: 45, price_cents: 3500 },
    })

    const appointment = (clientId: string, service: typeof haircut, start: Date, extra: object = {}) => ({
      client_id: clientId,
      provider_id: service.provider_id,
      service_id: service.id,
      starts_at: start,
      ends_at: new Date(start.getTime() + service.duration_minutes * 60_000),
      price_cents: service.price_cents,
      ...extra,
    })

    await prisma.appointment.createMany({
      data: [
        appointment(bruno.user.id, haircut, at(date, "11:00")),
        appointment(ana.user.id, haircut, at(date, "09:00")),
        appointment(ana.user.id, manicure, at(date, "14:00")),
        // Não entram: cancelado, e outro dia
        appointment(bruno.user.id, manicure, at(date, "10:00"), { status: "CANCELED" }),
        appointment(bruno.user.id, haircut, at(addDaysToDate(date, 1), "09:00")),
      ],
    })

    const { agendas } = await new BuildDailyAgendaService().execute(date)
    const byName = Object.fromEntries(agendas.map((agenda) => [agenda.provider_name, agenda.appointments]))

    expect(agendas).toHaveLength(2)
    expect(byName["Barbearia do Zé"]).toEqual([
      { local_time: "09:00", client_name: "Ana", service_name: "Corte" },
      { local_time: "11:00", client_name: "Bruno", service_name: "Corte" },
    ])
    expect(byName["Studio Bela"]).toEqual([{ local_time: "14:00", client_name: "Ana", service_name: "Manicure" }])
  })

  it("returns no agendas on a day without appointments", async () => {
    const { agendas } = await new BuildDailyAgendaService().execute("2030-01-01")

    expect(agendas).toEqual([])
  })
})
