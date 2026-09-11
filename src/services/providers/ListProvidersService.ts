/**
 * ListProvidersService.ts - A vitrine: lista quem atende pelo Pontual
 * # Pra que serve?
 * - Mostrar os prestadores com a quantidade de serviços ativos de cada um
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"

export class ListProvidersService {
  async execute() {
    const providers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        // Conta só os ativos (desativado não aparece pro cliente)
        _count: { select: { services: { where: { active: true } } } },
      },
      orderBy: { name: "asc" },
    })

    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      active_services: provider._count.services,
    }))
  }
}
