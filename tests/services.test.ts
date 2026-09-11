import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

const HAIRCUT = { name: "Corte masculino", duration_minutes: 30, price_cents: 4500 }

describe("provider services", () => {
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

  it("only lets providers manage services", async () => {
    const client = await createUserAndLogin(app, { role: "CLIENT" })

    const response = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(client.token),
      payload: HAIRCUT,
    })

    expect(response.statusCode).toBe(403)
  })

  it("creates a service for the logged in provider", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const response = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(provider.token),
      payload: HAIRCUT,
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({ ...HAIRCUT, provider_id: provider.user.id, active: true })
  })

  it("rejects durations that are not multiples of 5 minutes", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const response = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(provider.token),
      payload: { ...HAIRCUT, duration_minutes: 37 },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().issues[0].field).toBe("body.duration_minutes")
  })

  it("updates only the fields that were sent", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })
    const created = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(provider.token),
      payload: HAIRCUT,
    })

    const response = await app.inject({
      method: "PATCH",
      url: `/services/${created.json().id}`,
      headers: authHeader(provider.token),
      payload: { price_cents: 5000 },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ name: HAIRCUT.name, price_cents: 5000 })
  })

  it("does not let a provider touch another provider's service", async () => {
    const owner = await createUserAndLogin(app, { role: "PROVIDER" })
    const intruder = await createUserAndLogin(app, { role: "PROVIDER" })
    const created = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(owner.token),
      payload: HAIRCUT,
    })
    const serviceUrl = `/services/${created.json().id}`

    const update = await app.inject({
      method: "PATCH",
      url: serviceUrl,
      headers: authHeader(intruder.token),
      payload: { price_cents: 1 },
    })
    const deactivate = await app.inject({ method: "DELETE", url: serviceUrl, headers: authHeader(intruder.token) })

    expect(update.statusCode).toBe(404)
    expect(deactivate.statusCode).toBe(404)
  })

  it("deactivates a service and keeps it in the provider's own list", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })
    const created = await app.inject({
      method: "POST",
      url: "/services",
      headers: authHeader(provider.token),
      payload: HAIRCUT,
    })

    const deactivate = await app.inject({
      method: "DELETE",
      url: `/services/${created.json().id}`,
      headers: authHeader(provider.token),
    })
    const mine = await app.inject({ method: "GET", url: "/services/mine", headers: authHeader(provider.token) })

    expect(deactivate.statusCode).toBe(204)
    expect(mine.json()).toEqual([expect.objectContaining({ id: created.json().id, active: false })])
  })
})
