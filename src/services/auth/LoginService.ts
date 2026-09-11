/**
 * LoginService.ts - Confere e-mail e senha
 * # Pra que serve?
 * - Achar o usuário pelo e-mail e comparar a senha com o hash
 * - Responder o mesmo erro pra e-mail que não existe e senha errada (pra ninguém descobrir quem tem conta)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { comparePassword, DUMMY_PASSWORD_HASH } from "../../utils/password.js"

export const INVALID_CREDENTIALS = "E-mail ou senha incorretos"

// O que a gente precisa pra logar:
interface LoginRequest {
  email: string
  password: string
}

export class LoginService {
  async execute({ email, password }: LoginRequest) {
    const user = await this.findUserByEmail(email)

    // Compara mesmo quando o usuário não existe, pra resposta levar o mesmo tempo nos dois casos
    const passwordMatches = await comparePassword(password, user?.password_hash ?? DUMMY_PASSWORD_HASH)

    if (!user || !passwordMatches) throw new Error(INVALID_CREDENTIALS)

    // Devolve sem o hash (ele não sai daqui de jeito nenhum)
    const { password_hash: _, ...publicUser } = user
    return publicUser
  }

  private async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, role: true, created_at: true, password_hash: true },
    })
  }
}
