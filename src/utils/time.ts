/**
 * time.ts - Conversões de horário que a agenda inteira usa
 * # Pra que serve?
 * - Transformar "09:30" em minutos desde a meia-noite (570) e o contrário
 * - No banco fica número, que é fácil de comparar e somar; na API fica "HH:MM", que é fácil de ler
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const MINUTES_IN_A_DAY = 24 * 60

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0")
  const minutes = (totalMinutes % 60).toString().padStart(2, "0")
  return `${hours}:${minutes}`
}
