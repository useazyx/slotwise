import { describe, expect, it } from "vitest"
import {
  addDaysToDate,
  getWeekday,
  getZonedDate,
  getZonedTime,
  isValidCalendarDate,
  zonedDateTimeToUtc,
} from "../src/utils/timezone.js"

describe("timezone helpers", () => {
  it("turns a local time in São Paulo into the right UTC instant", () => {
    expect(zonedDateTimeToUtc("2026-09-20", 9 * 60, "America/Sao_Paulo").toISOString()).toBe(
      "2026-09-20T12:00:00.000Z"
    )
  })

  it("handles the daylight saving jump", () => {
    // New York skips from 02:00 to 03:00 on 2026-03-08
    expect(zonedDateTimeToUtc("2026-03-08", 90, "America/New_York").toISOString()).toBe("2026-03-08T06:30:00.000Z")
    expect(zonedDateTimeToUtc("2026-03-08", 210, "America/New_York").toISOString()).toBe("2026-03-08T07:30:00.000Z")
  })

  it("reads the local date and time of an instant", () => {
    const lateNightInSaoPaulo = new Date("2026-09-20T02:30:00.000Z")

    expect(getZonedDate(lateNightInSaoPaulo, "America/Sao_Paulo")).toBe("2026-09-19")
    expect(getZonedTime(lateNightInSaoPaulo, "America/Sao_Paulo")).toBe("23:30")
  })

  it("works with calendar dates", () => {
    expect(getWeekday("2026-09-20")).toBe(0)
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01")
    expect(isValidCalendarDate("2026-02-29")).toBe(false)
    expect(isValidCalendarDate("2028-02-29")).toBe(true)
  })
})
