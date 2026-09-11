/**
 * ListProviderServicesService.ts - O cardápio público de um prestador
 * # Pra que serve?
 * - Listar só os serviços ativos, que são os que o cliente pode marcar
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { SERVICE_SELECT } from "../catalog/CreateServiceService.js"
import { FindProviderService } from "./FindProviderService.js"

export class ListProviderServicesService {
  async execute(providerId: string) {
    const findProviderService = new FindProviderService()
    await findProviderService.execute(providerId)

    return prisma.service.findMany({
      where: { provider_id: providerId, active: true },
      select: SERVICE_SELECT,
      orderBy: { name: "asc" },
    })
  }
}
