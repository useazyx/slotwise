/**
 * authRoutes.ts - As rotas de cadastro, login e perfil
 * # Pra que serve?
 * - Ligar cada rota ao controller dela, com o schema que valida e documenta
 * - Cadastro e login com rate limit mais apertado (contra chute de senha e cadastro em massa)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Rate limit próprio em /register e /login
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { GetProfileController } from "../controllers/auth/GetProfileController.js"
import { LoginController } from "../controllers/auth/LoginController.js"
import { RegisterUserController } from "../controllers/auth/RegisterUserController.js"
import { AUTH_RATE_LIMIT } from "../plugins/security.js"
import {
  LOGIN_BODY_SCHEMA,
  LOGIN_RESPONSE_SCHEMA,
  PUBLIC_USER_SCHEMA,
  REGISTER_BODY_SCHEMA,
} from "../schemas/authSchemas.js"

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  // ---------- Rotas públicas ----------

  app.post(
    "/register",
    {
      config: { rateLimit: AUTH_RATE_LIMIT },
      schema: {
        tags: ["Auth"],
        summary: "Cria uma conta de cliente ou de prestador",
        body: REGISTER_BODY_SCHEMA,
        response: { 201: PUBLIC_USER_SCHEMA },
      },
    },
    (req, rep) => new RegisterUserController().handle(req, rep)
  )

  app.post(
    "/login",
    {
      config: { rateLimit: AUTH_RATE_LIMIT },
      schema: {
        tags: ["Auth"],
        summary: "Faz login e devolve o token",
        body: LOGIN_BODY_SCHEMA,
        response: { 200: LOGIN_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new LoginController().handle(req, rep)
  )

  // ---------- Rotas privadas (passam pelo porteiro) ----------

  app.get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Dados de quem está logado",
        security: [{ bearerAuth: [] }],
        response: { 200: PUBLIC_USER_SCHEMA },
      },
    },
    (req, rep) => new GetProfileController().handle(req, rep)
  )
}
