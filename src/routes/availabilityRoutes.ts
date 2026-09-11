/**
 * availabilityRoutes.ts - As rotas pro prestador montar a semana de atendimento
 * # Pra que serve?
 * - Trocar a semana inteira e consultar como ela está
 * - Tudo aqui passa pelo porteiro e só aceita conta de prestador
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { GetMyAvailabilityController } from "../controllers/availability/GetMyAvailabilityController.js"
import { ReplaceAvailabilityController } from "../controllers/availability/ReplaceAvailabilityController.js"
import {
  AVAILABILITY_RESPONSE_SCHEMA,
  REPLACE_AVAILABILITY_BODY_SCHEMA,
} from "../schemas/availabilitySchemas.js"

export const availabilityRoutes: FastifyPluginAsyncZod = async (app) => {
  // ---------- Rotas privadas: só prestador ----------
  app.addHook("onRequest", app.authenticate)
  app.addHook("onRequest", app.requireRole("PROVIDER"))

  app.put(
    "/",
    {
      schema: {
        tags: ["Availability"],
        summary: "Troca a semana de atendimento inteira",
        security: [{ bearerAuth: [] }],
        body: REPLACE_AVAILABILITY_BODY_SCHEMA,
        response: { 200: AVAILABILITY_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new ReplaceAvailabilityController().handle(req, rep)
  )

  app.get(
    "/mine",
    {
      schema: {
        tags: ["Availability"],
        summary: "Mostra a minha semana de atendimento",
        security: [{ bearerAuth: [] }],
        response: { 200: AVAILABILITY_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new GetMyAvailabilityController().handle(req, rep)
  )
}
