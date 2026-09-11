/**
 * authRoutes.ts - As rotas de cadastro, login e perfil
 * # Pra que serve?
 * - Ligar cada rota ao controller dela, com o schema que valida e documenta
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { GetProfileController } from "../controllers/auth/GetProfileController.js"
import { LoginController } from "../controllers/auth/LoginController.js"
import { RegisterUserController } from "../controllers/auth/RegisterUserController.js"
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
