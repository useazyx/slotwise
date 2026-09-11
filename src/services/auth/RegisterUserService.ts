/**
 * RegisterUserService.ts - Cria a conta de um cliente ou de um prestador
 * # Pra que serve?
 * - Garantir que o e-mail ainda não tem conta
 * - Salvar o usuário com a senha em hash (nunca a senha pura)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { Prisma, type UserRole } from "@prisma/client"
import { prisma } from "../../config/prisma.js"
import { hashPassword } from "../../utils/password.js"

export const EMAIL_ALREADY_USED = "E-mail já cadastrado"

// Os campos que podem sair da API (password_hash nunca entra aqui)
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  created_at: true,
} satisfies Prisma.UserSelect

// O que a gente precisa pra criar a conta:
interface RegisterUserRequest {
  name: string
  email: string
  password: string
  role: UserRole
}

export class RegisterUserService {
  async execute(data: RegisterUserRequest) {
    const email = this.normalizeEmail(data.email)

    // Checa antes pra dar erro amigável no caso comum
    await this.ensureEmailIsFree(email)

    const password_hash = await hashPassword(data.password)

    return this.createUser({ name: data.name, email, role: data.role, password_hash })
  }

  // E-mail sem espaço e minúsculo (senão "Ana@X.com" e "ana@x.com" viram duas contas)
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  private async ensureEmailIsFree(email: string) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) throw new Error(EMAIL_ALREADY_USED)
  }

  // Salva no banco. Se dois cadastros com o mesmo e-mail chegarem juntos, o índice único segura o segundo.
  private async createUser(data: Prisma.UserCreateInput) {
    try {
      return await prisma.user.create({ data, select: PUBLIC_USER_SELECT })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error(EMAIL_ALREADY_USED)
      }
      throw error
    }
  }
}
