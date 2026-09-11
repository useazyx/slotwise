import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { prisma } from "../src/config/prisma.js"
import { authHeader, createTestApp, createUserAndLogin, resetDatabase, type TestApp } from "./helpers.js"

describe("provider availability", () => {
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

  const putWeek = (token: string, slots: unknown[]) =>
    app.inject({ method: "PUT", url: "/availability", headers: authHeader(token), payload: { slots } })

  it("saves the week sorted by day and time", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const response = await putWeek(provider.token, [
      { weekday: 2, start: "14:00", end: "18:00" },
      { weekday: 1, start: "09:00", end: "12:00" },
      { weekday: 2, start: "09:00", end: "12:00" },
    ])

    expect(response.statusCode).toBe(200)
    expect(response.json().slots).toEqual([
      { weekday: 1, start: "09:00", end: "12:00" },
      { weekday: 2, start: "09:00", end: "12:00" },
      { weekday: 2, start: "14:00", end: "18:00" },
    ])
  })

  it("replaces the previous week instead of adding to it", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })
    await putWeek(provider.token, [{ weekday: 1, start: "09:00", end: "12:00" }])

    await putWeek(provider.token, [{ weekday: 5, start: "10:00", end: "16:00" }])
    const mine = await app.inject({ method: "GET", url: "/availability/mine", headers: authHeader(provider.token) })

    expect(mine.json().slots).toEqual([{ weekday: 5, start: "10:00", end: "16:00" }])
  })

  it("allows ranges that touch but not ranges that overlap", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const touching = await putWeek(provider.token, [
      { weekday: 3, start: "09:00", end: "12:00" },
      { weekday: 3, start: "12:00", end: "18:00" },
    ])
    const overlapping = await putWeek(provider.token, [
      { weekday: 3, start: "09:00", end: "12:30" },
      { weekday: 3, start: "12:00", end: "18:00" },
    ])

    expect(touching.statusCode).toBe(200)
    expect(overlapping.statusCode).toBe(400)
    expect(overlapping.json().error).toBe("OverlappingAvailability")
  })

  it("rejects a range that ends before it starts", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const response = await putWeek(provider.token, [{ weekday: 1, start: "18:00", end: "09:00" }])

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe("InvalidTimeRange")
  })

  it("rejects times outside HH:MM", async () => {
    const provider = await createUserAndLogin(app, { role: "PROVIDER" })

    const response = await putWeek(provider.token, [{ weekday: 1, start: "25:00", end: "26:00" }])

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe("ValidationError")
  })

  it("is off limits for clients", async () => {
    const client = await createUserAndLogin(app, { role: "CLIENT" })

    const response = await putWeek(client.token, [])

    expect(response.statusCode).toBe(403)
  })
})
