import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { createTestApp, type TestApp } from "./helpers.js"

describe("API documentation", () => {
  let app: TestApp

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it("publishes an OpenAPI document generated from the route schemas", async () => {
    const response = await app.inject({ method: "GET", url: "/docs/json" })

    expect(response.statusCode).toBe(200)
    const doc = response.json()
    expect(doc.openapi).toMatch(/^3\./)
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(["/auth/login", "/providers/{id}/slots", "/appointments/{id}/reschedule"])
    )
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" })

    const loginBody = doc.paths["/auth/login"].post.requestBody.content["application/json"].schema
    expect(loginBody.required).toEqual(expect.arrayContaining(["email", "password"]))
  })

  it("serves the interactive docs page", async () => {
    const response = await app.inject({ method: "GET", url: "/docs" })

    expect([200, 302]).toContain(response.statusCode)
  })
})
