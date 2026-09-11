/**
 * authSchemas.ts - O formato do que entra e sai nas rotas de autenticação
 * # Pra que serve?
 * - Validar cadastro e login antes de chegar no controller (formato é problema do schema)
 * - Descrever as respostas, que também viram a documentação da API
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"

export const USER_ROLE_SCHEMA = z.enum(["CLIENT", "PROVIDER"])

// Tira espaço e deixa minúsculo ANTES de validar (senão " Ana@X.com " é recusado por causa do espaço)
export const EMAIL_SCHEMA = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido").max(120))

export const REGISTER_BODY_SCHEMA = z.object({
  name: z.string().trim().min(2, "Nome precisa de pelo menos 2 letras").max(80),
  email: EMAIL_SCHEMA,
  // bcrypt só olha os primeiros 72 bytes, então nem deixa passar disso
  password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres").max(72),
  role: USER_ROLE_SCHEMA.default("CLIENT"),
})

export const LOGIN_BODY_SCHEMA = z.object({
  email: EMAIL_SCHEMA,
  password: z.string().min(1, "Faltou a senha"),
})

export const PUBLIC_USER_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: USER_ROLE_SCHEMA,
  created_at: z.date(),
})

export const LOGIN_RESPONSE_SCHEMA = z.object({
  token: z.string(),
  user: PUBLIC_USER_SCHEMA,
})

export type RegisterBody = z.infer<typeof REGISTER_BODY_SCHEMA>
export type LoginBody = z.infer<typeof LOGIN_BODY_SCHEMA>
