/**
 * GetProfileService.ts - Busca os dados de quem está logado
 * # Pra que serve?
 * - Devolver o usuário dono do token (útil pro front saber quem é e qual o papel)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { PUBLIC_USER_SELECT } from "./RegisterUserService.js"

export const USER_NOT_FOUND = "Usuário não encontrado"

export class GetProfileService {
  async execute(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT })

    // Token válido de uma conta que foi apagada depois
    if (!user) throw new Error(USER_NOT_FOUND)

    return user
  }
}
