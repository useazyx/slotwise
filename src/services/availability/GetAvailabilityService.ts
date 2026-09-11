/**
 * GetAvailabilityService.ts - Monta a semana de atendimento de um prestador
 * # Pra que serve?
 * - Buscar as faixas salvas e devolver em "HH:MM", em ordem de dia e horário
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { minutesToTime } from "../../utils/time.js"
import { FindProviderService } from "../providers/FindProviderService.js"

export class GetAvailabilityService {
  async execute(providerId: string) {
    // Garante que é prestador de verdade (senão devolveria semana vazia pra qualquer id)
    const findProviderService = new FindProviderService()
    await findProviderService.execute(providerId)

    const availabilities = await prisma.availability.findMany({
      where: { provider_id: providerId },
      orderBy: [{ weekday: "asc" }, { start_minute: "asc" }],
    })

    return {
      provider_id: providerId,
      slots: availabilities.map((item) => ({
        weekday: item.weekday,
        start: minutesToTime(item.start_minute),
        end: minutesToTime(item.end_minute),
      })),
    }
  }
}
