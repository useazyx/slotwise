import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { createTestApp, resetDatabase, type TestApp } from "./helpers.js"

describe("security", () => {
  let app: TestApp

  beforeAll(async () => {
    await resetDatabase()
    app = await createTestApp({ rateLimit: true })
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it("sends the usual security headers", async () => {
    const response = await app.inject({ method: "GET", url: "/health" })

    expect(response.headers["x-content-type-options"]).toBe("nosniff")
    expect(response.headers["x-frame-options"]).toBeDefined()
  })

  it("answers CORS requests from the browser", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://agenda.exemplo.com" },
    })

    expect(response.headers["access-control-allow-origin"]).toBeDefined()
  })

  it("blocks login after 10 attempts in a minute, in the API error format", async () => {
    const attempt = () =>
      app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "chute@teste.com", password: "senha-errada" },
      })

    const statuses: number[] = []
    for (let i = 0; i < 10; i++) statuses.push((await attempt()).statusCode)
    const blocked = await attempt()

    expect(statuses.every((status) => status === 401)).toBe(true)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toMatchObject({ error: "TooManyRequests" })
    expect(blocked.headers["retry-after"]).toBeDefined()

    // O limite do login não trava o resto da API
    const health = await app.inject({ method: "GET", url: "/health" })
    expect(health.statusCode).toBe(200)
  })
})
