/**
 * timezone.ts - Fuso horário sem biblioteca, só com o Intl que já vem no Node
 * # Pra que serve?
 * - Transformar "dia 20 às 09:00 em São Paulo" num instante UTC (que é como vai pro banco)
 * - Fazer o caminho de volta: pegar um instante e dizer que dia e que horas são no fuso
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

const MINUTE_IN_MS = 60_000

// Quebra um instante nas partes de data e hora vistas no fuso (ano, mês, dia, hora, minuto)
function getZonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

// Quantos minutos o fuso está deslocado do UTC naquele instante (São Paulo hoje dá -180)
export function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const zoned = getZonedParts(instant, timeZone)
  const zonedAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second)
  return Math.round((zonedAsUtc - instant.getTime()) / MINUTE_IN_MS)
}

// "2026-09-20" + 540 minutos (09:00) no fuso -> instante UTC certinho
export function zonedDateTimeToUtc(date: string, minuteOfDay: number, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay)

  // Primeiro chute usando o deslocamento daquele momento...
  const firstGuess = naive - getTimeZoneOffsetMinutes(new Date(naive), timeZone) * MINUTE_IN_MS
  // ...e uma segunda passada, que corrige quando o fuso muda no meio (horário de verão)
  const offset = getTimeZoneOffsetMinutes(new Date(firstGuess), timeZone)

  return new Date(naive - offset * MINUTE_IN_MS)
}

// Instante -> "YYYY-MM-DD" no fuso
export function getZonedDate(instant: Date, timeZone: string): string {
  const { year, month, day } = getZonedParts(instant, timeZone)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// Instante -> "HH:MM" no fuso
export function getZonedTime(instant: Date, timeZone: string): string {
  const { hour, minute } = getZonedParts(instant, timeZone)
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// Dia da semana de uma data de calendário (0 = domingo). Não depende de fuso: é só o calendário.
export function getWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// Soma dias numa data de calendário ("2026-09-30" + 1 = "2026-10-01")
export function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

// Confere se a data existe no calendário (31 de fevereiro não passa)
export function isValidCalendarDate(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}
