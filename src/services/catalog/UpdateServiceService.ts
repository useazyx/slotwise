/**
 * UpdateServiceService.ts - Altera um serviço do prestador
 * # Pra que serve?
 * - Mudar só os campos que vieram (nome, preço, duração, ativo)
 * - Garantir que ninguém mexe no serviço de outro prestador
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { SERVICE_SELECT } from "./CreateServiceService.js"

export const SERVICE_NOT_FOUND = "Serviço não encontrado"

// O que a gente precisa pra alterar:
interface UpdateServiceRequest {
  id: string
  provider_id: string
  changes: {
    name?: string
    description?: string
    duration_minutes?: number
    price_cents?: number
    active?: boolean
  }
}

export class UpdateServiceService {
  async execute({ id, provider_id, changes }: UpdateServiceRequest) {
    await this.ensureServiceBelongsToProvider(id, provider_id)

    // Agendamento já marcado guarda o próprio preço e horário, então mudar aqui não afeta ninguém
    return prisma.service.update({ where: { id }, data: changes, select: SERVICE_SELECT })
  }

  // Serviço de outro prestador responde igual a serviço que não existe (pra não entregar o que existe)
  private async ensureServiceBelongsToProvider(id: string, providerId: string) {
    const service = await prisma.service.findFirst({ where: { id, provider_id: providerId }, select: { id: true } })
    if (!service) throw new Error(SERVICE_NOT_FOUND)
  }
}
