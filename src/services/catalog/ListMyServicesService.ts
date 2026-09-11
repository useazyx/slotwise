/**
 * ListMyServicesService.ts - Lista os serviços do próprio prestador
 * # Pra que serve?
 * - Mostrar pro prestador tudo que ele cadastrou, inclusive o que está desativado
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { SERVICE_SELECT } from "./CreateServiceService.js"

export class ListMyServicesService {
  async execute(providerId: string) {
    // Ativos primeiro, depois em ordem alfabética (o desativado vai pro fim da lista)
    return prisma.service.findMany({
      where: { provider_id: providerId },
      select: SERVICE_SELECT,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    })
  }
}
