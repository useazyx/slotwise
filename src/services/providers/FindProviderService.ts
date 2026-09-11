/**
 * FindProviderService.ts - Confere se um id é mesmo de um prestador
 * # Pra que serve?
 * - Evitar montar agenda ou catálogo pra um id que não existe ou que é de cliente
 * - Ser reaproveitado por todo service que recebe o id do prestador pela URL
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"

export const PROVIDER_NOT_FOUND = "Prestador não encontrado"

export class FindProviderService {
  async execute(providerId: string) {
    const provider = await prisma.user.findFirst({
      where: { id: providerId, role: "PROVIDER" },
      select: { id: true, name: true },
    })

    if (!provider) throw new Error(PROVIDER_NOT_FOUND)

    return provider
  }
}
