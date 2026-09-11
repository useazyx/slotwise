import { randomUUID } from "node:crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

describe("public provider pages", () => {
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

  async function createProviderWithServices() {
    const provider = await createUserAndLogin(app, { role: "PROVIDER", name: "Studio Bela" })
    const headers = authHeader(provider.token)

    const active = await app.inject({
      method: "POST",
      url: "/services",
      headers,
      payload: { name: "Manicure", duration_minutes: 45, price_cents: 3500 },
    })
    const retired = await app.inject({
      method: "POST",
      url: "/services",
      headers,
      payload: { name: "Pedicure", duration_minutes: 45, price_cents: 3500 },
    })
    await app.inject({ method: "DELETE", url: `/services/${retired.json().id}`, headers })
    await app.inject({
      method: "PUT",
      url: "/availability",
      headers,
      payload: { slots: [{ weekday: 2, start: "09:00", end: "17:00" }] },
    })

    return { provider, activeService: active.json() }
  }

  it("lists only providers, with their number of active services", async () => {
    await createUserAndLogin(app, { role: "CLIENT", name: "Cliente" })
    const { provider } = await createProviderWithServices()

    const response = await app.inject({ method: "GET", url: "/providers" })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([{ id: provider.user.id, name: "Studio Bela", active_services: 1 }])
  })

  it("shows only active services without requiring login", async () => {
    const { provider, activeService } = await createProviderWithServices()

    const response = await app.inject({ method: "GET", url: `/providers/${provider.user.id}/services` })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([activeService])
  })

  it("shows the provider's weekly availability", async () => {
    const { provider } = await createProviderWithServices()

    const response = await app.inject({ method: "GET", url: `/providers/${provider.user.id}/availability` })

    expect(response.json().slots).toEqual([{ weekday: 2, start: "09:00", end: "17:00" }])
  })

  it("answers 404 for ids that are not providers", async () => {
    const client = await createUserAndLogin(app, { role: "CLIENT" })

    const clientId = await app.inject({ method: "GET", url: `/providers/${client.user.id}/services` })
    const unknownId = await app.inject({ method: "GET", url: `/providers/${randomUUID()}/availability` })
    const notAnId = await app.inject({ method: "GET", url: "/providers/abc/services" })

    expect(clientId.statusCode).toBe(404)
    expect(unknownId.statusCode).toBe(404)
    expect(notAnId.statusCode).toBe(400)
  })
})
