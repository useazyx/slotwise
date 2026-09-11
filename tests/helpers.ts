/**
 * helpers.ts - Atalhos que todo teste usa
 * # Pra que serve?
 * - Subir a API sem abrir porta (buildApp + inject)
 * - Limpar o banco entre um teste e outro
 * - Criar conta e já pegar o token, pra não repetir isso em todo arquivo
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { randomUUID } from "node:crypto"
import { buildApp } from "../src/app.js"
import { prisma } from "../src/config/prisma.js"

export type TestApp = Awaited<ReturnType<typeof buildApp>>

export async function createTestApp() {
  const app = await buildApp()
  await app.ready()
  return app
}

// Apaga tudo de uma vez (CASCADE leva junto o que depende)
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "reminders", "appointments", "availabilities", "services", "users" RESTART IDENTITY CASCADE'
  )
}

interface CreateUserOptions {
  role?: "CLIENT" | "PROVIDER"
  name?: string
}

// Cadastra e loga, devolvendo o token e o usuário
export async function createUserAndLogin(app: TestApp, options: CreateUserOptions = {}) {
  const email = `${randomUUID()}@teste.com`
  const password = "senha-de-teste-123"

  const register = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: options.name ?? "Pessoa de Teste", email, password, role: options.role ?? "CLIENT" },
  })

  const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password } })

  return {
    user: register.json(),
    token: login.json().token as string,
    email,
    password,
  }
}

export const authHeader = (token: string) => ({ authorization: `Bearer ${token}` })
