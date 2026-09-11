/**
 * ReplaceAvailabilityService.ts - Troca a semana de atendimento inteira do prestador
 * # Pra que serve?
 * - Conferir que cada faixa termina depois de começar e que não tem faixa encavalada no mesmo dia
 * - Apagar a semana antiga e salvar a nova de uma vez só (transação: ou vai tudo, ou nada)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { timeToMinutes } from "../../utils/time.js"
import { GetAvailabilityService } from "./GetAvailabilityService.js"

export const INVALID_TIME_RANGE = "Faixa de horário termina antes de começar"
export const OVERLAPPING_AVAILABILITY = "Faixas de horário encavaladas no mesmo dia"

// O que a gente precisa pra trocar a semana:
interface ReplaceAvailabilityRequest {
  provider_id: string
  slots: { weekday: number; start: string; end: string }[]
}

// A faixa já convertida pra minutos (é assim que vai pro banco)
interface MinuteSlot {
  weekday: number
  start_minute: number
  end_minute: number
}

export class ReplaceAvailabilityService {
  async execute({ provider_id, slots }: ReplaceAvailabilityRequest) {
    const minuteSlots = this.toMinuteSlots(slots)

    this.validateRanges(minuteSlots)
    this.validateNoOverlap(minuteSlots)

    await this.saveWeek(provider_id, minuteSlots)

    // Devolve do jeito que ficou salvo (ordenado), igual ao GET
    const getAvailabilityService = new GetAvailabilityService()
    return getAvailabilityService.execute(provider_id)
  }

  private toMinuteSlots(slots: ReplaceAvailabilityRequest["slots"]): MinuteSlot[] {
    return slots.map((slot) => ({
      weekday: slot.weekday,
      start_minute: timeToMinutes(slot.start),
      end_minute: timeToMinutes(slot.end),
    }))
  }

  private validateRanges(slots: MinuteSlot[]) {
    const invalid = slots.some((slot) => slot.end_minute <= slot.start_minute)
    if (invalid) throw new Error(INVALID_TIME_RANGE)
  }

  // Ordena por dia e começo; se uma faixa começa antes da anterior acabar, tá encavalado.
  // Encostar pode (12:00-13:00 e 13:00-18:00), passar por cima não.
  private validateNoOverlap(slots: MinuteSlot[]) {
    const sorted = [...slots].sort((a, b) => a.weekday - b.weekday || a.start_minute - b.start_minute)

    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1]
      const current = sorted[i]
      if (previous.weekday === current.weekday && current.start_minute < previous.end_minute) {
        throw new Error(OVERLAPPING_AVAILABILITY)
      }
    }
  }

  private async saveWeek(providerId: string, slots: MinuteSlot[]) {
    await prisma.$transaction([
      prisma.availability.deleteMany({ where: { provider_id: providerId } }),
      prisma.availability.createMany({ data: slots.map((slot) => ({ ...slot, provider_id: providerId })) }),
    ])
  }
}
