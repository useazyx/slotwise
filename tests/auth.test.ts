import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

describe("auth", () => {
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

  describe("POST /auth/register", () => {
    it("creates a client account by default and never returns the password hash", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: "Ana Souza", email: "ana@cliente.com", password: "senha-forte-123" },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json()).toMatchObject({ name: "Ana Souza", email: "ana@cliente.com", role: "CLIENT" })
      expect(response.body).not.toContain("password")

      const saved = await prisma.user.findUniqueOrThrow({ where: { email: "ana@cliente.com" } })
      expect(saved.password_hash).not.toBe("senha-forte-123")
    })

    it("treats emails with different case and spaces as the same account", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: "Ana", email: "ana@cliente.com", password: "senha-forte-123" },
      })

      const duplicate = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: "Outra Ana", email: "  ANA@Cliente.com ", password: "senha-forte-123" },
      })

      expect(duplicate.statusCode).toBe(409)
      expect(duplicate.json().error).toBe("EmailAlreadyUsed")
    })

    it("rejects invalid fields and says which ones", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { name: "A", email: "not-an-email", password: "123" },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error).toBe("ValidationError")
      const fields = body.issues.map((issue: { field: string }) => issue.field)
      expect(fields).toEqual(expect.arrayContaining(["body.name", "body.email", "body.password"]))
    })
  })

  describe("POST /auth/login", () => {
    it("returns a token for the right password", async () => {
      const { email, password } = await createUserAndLogin(app)

      const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password } })

      expect(response.statusCode).toBe(200)
      expect(response.json().token).toEqual(expect.any(String))
    })

    it("answers the same way for a wrong password and an unknown email", async () => {
      const { email } = await createUserAndLogin(app)

      const wrongPassword = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: "senha-errada" },
      })
      const unknownEmail = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "ninguem@teste.com", password: "senha-errada" },
      })

      expect(wrongPassword.statusCode).toBe(401)
      expect(unknownEmail.statusCode).toBe(401)
      expect(wrongPassword.json()).toEqual(unknownEmail.json())
    })
  })

  describe("GET /auth/me", () => {
    it("requires a valid token", async () => {
      const withoutToken = await app.inject({ method: "GET", url: "/auth/me" })
      const withBadToken = await app.inject({ method: "GET", url: "/auth/me", headers: authHeader("abc.def.ghi") })

      expect(withoutToken.statusCode).toBe(401)
      expect(withBadToken.statusCode).toBe(401)
    })

    it("returns the logged in user", async () => {
      const { token, email } = await createUserAndLogin(app, { role: "PROVIDER" })

      const response = await app.inject({ method: "GET", url: "/auth/me", headers: authHeader(token) })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ email, role: "PROVIDER" })
    })
  })
})
