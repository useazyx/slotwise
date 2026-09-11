/**
 * ListAvailableSlotsService.ts - Calcula os horários livres de um prestador num dia
 * # Pra que serve?
 * - Pegar as faixas de atendimento daquele dia da semana e fatiar no tamanho do serviço
 * - Tirar o que já está ocupado por outro agendamento e o que já passou (ou está em cima da hora)
 * - Tudo no fuso do negócio: "09:00" é 09:00 em São Paulo, não no relógio do servidor
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import {
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_NOTICE_MINUTES,
  SLOT_STEP_MINUTES,
} from "../../config/bookingRules.js"
import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { addDaysToDate, getWeekday, getZonedDate, getZonedTime, zonedDateTimeToUtc } from "../../utils/timezone.js"
import { SERVICE_NOT_FOUND } from "../catalog/UpdateServiceService.js"
import { FindProviderService } from "../providers/FindProviderService.js"

export const DATE_TOO_FAR_AHEAD = "Data depois do limite de agendamento"

// O que a gente precisa pra montar a lista:
interface ListAvailableSlotsRequest {
  provider_id: string
  service_id: string
  date: string
}

// Um intervalo de tempo já em instantes UTC
interface TimeRange {
  starts_at: Date
  ends_at: Date
}

export class ListAvailableSlotsService {
  async execute({ provider_id, service_id, date }: ListAvailableSlotsRequest) {
    const timeZone = env.APP_TIMEZONE

    this.validateDateWindow(date, timeZone)

    const findProviderService = new FindProviderService()
    await findProviderService.execute(provider_id)

    const service = await this.findActiveService(service_id, provider_id)

    // Busca em paralelo: as faixas do dia e o que já está marcado
    const [ranges, busy] = await Promise.all([
      this.findRangesForWeekday(provider_id, getWeekday(date)),
      this.findBusyRanges(provider_id, date, timeZone),
    ])

    const candidates = this.buildCandidates(ranges, date, service.duration_minutes, timeZone)
    const earliestStart = new Date(Date.now() + MIN_BOOKING_NOTICE_MINUTES * 60_000)

    const slots = candidates
      .filter((slot) => slot.starts_at >= earliestStart)
      .filter((slot) => !busy.some((taken) => this.overlaps(slot, taken)))
      .map((slot) => ({
        starts_at: slot.starts_at.toISOString(),
        ends_at: slot.ends_at.toISOString(),
        local_time: getZonedTime(slot.starts_at, timeZone),
      }))

    return {
      date,
      timezone: timeZone,
      service: { id: service.id, name: service.name, duration_minutes: service.duration_minutes },
      slots,
    }
  }

  // Dia no passado só volta vazio (os horários somem no filtro), mas longe demais é erro
  private validateDateWindow(date: string, timeZone: string) {
    const today = getZonedDate(new Date(), timeZone)
    const lastBookableDate = addDaysToDate(today, MAX_BOOKING_DAYS_AHEAD)

    if (date > lastBookableDate) throw new Error(DATE_TOO_FAR_AHEAD)
  }

  // Serviço desativado ou de outro prestador não serve pra montar agenda
  private async findActiveService(serviceId: string, providerId: string) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, provider_id: providerId, active: true },
      select: { id: true, name: true, duration_minutes: true },
    })

    if (!service) throw new Error(SERVICE_NOT_FOUND)
    return service
  }

  private async findRangesForWeekday(providerId: string, weekday: number) {
    return prisma.availability.findMany({
      where: { provider_id: providerId, weekday },
      orderBy: { start_minute: "asc" },
    })
  }

  // Tudo que está marcado e encosta naquele dia (inclusive o que começou na véspera e invade)
  private async findBusyRanges(providerId: string, date: string, timeZone: string): Promise<TimeRange[]> {
    const dayStart = zonedDateTimeToUtc(date, 0, timeZone)
    const dayEnd = zonedDateTimeToUtc(addDaysToDate(date, 1), 0, timeZone)

    return prisma.appointment.findMany({
      where: {
        provider_id: providerId,
        status: "SCHEDULED",
        starts_at: { lt: dayEnd },
        ends_at: { gt: dayStart },
      },
      select: { starts_at: true, ends_at: true },
    })
  }

  // Fatia cada faixa de 15 em 15 minutos, só onde o serviço inteiro cabe antes da faixa acabar
  private buildCandidates(
    ranges: { start_minute: number; end_minute: number }[],
    date: string,
    durationMinutes: number,
    timeZone: string
  ): TimeRange[] {
    const candidates: TimeRange[] = []

    for (const range of ranges) {
      for (let minute = range.start_minute; minute + durationMinutes <= range.end_minute; minute += SLOT_STEP_MINUTES) {
        candidates.push({
          starts_at: zonedDateTimeToUtc(date, minute, timeZone),
          ends_at: zonedDateTimeToUtc(date, minute + durationMinutes, timeZone),
        })
      }
    }

    return candidates
  }

  // Dois intervalos se cruzam quando um começa antes do outro terminar (encostar não conta)
  private overlaps(a: TimeRange, b: TimeRange): boolean {
    return a.starts_at < b.ends_at && b.starts_at < a.ends_at
  }
}
