import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { DEMO_PASSWORD, seed } from "../prisma/seed.js"
import { prisma } from "../src/config/prisma.js"
import { createTestApp, resetDatabase, type TestApp } from "./helpers.js"

describe("demo seed", () => {
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

  it("can run again and again without duplicating anything", async () => {
    await seed()
    await seed()

    expect(await prisma.user.count()).toBe(3)
    expect(await prisma.service.count()).toBe(6)
    expect(await prisma.availability.count()).toBe(15)
  })

  it("creates accounts that can log in and providers with free slots", async () => {
    await seed()

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ana@pontual.dev", password: DEMO_PASSWORD },
    })
    const providers = await app.inject({ method: "GET", url: "/providers" })

    expect(login.statusCode).toBe(200)
    expect(providers.json()).toEqual([
      expect.objectContaining({ name: "Barbearia do Zé", active_services: 3 }),
      expect.objectContaining({ name: "Studio Bela", active_services: 3 }),
    ])
  })
})
