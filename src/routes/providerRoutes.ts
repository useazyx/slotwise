/**
 * providerRoutes.ts - A parte pública: o que o cliente vê antes de marcar
 * # Pra que serve?
 * - Listar prestadores, os serviços ativos e a semana de atendimento de cada um
 * - Calcular os horários livres de um dia
 * - Nada aqui precisa de login
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Horários livres em /:id/slots
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { GetProviderAvailabilityController } from "../controllers/providers/GetProviderAvailabilityController.js"
import { ListProviderServicesController } from "../controllers/providers/ListProviderServicesController.js"
import { ListProvidersController } from "../controllers/providers/ListProvidersController.js"
import { ListAvailableSlotsController } from "../controllers/scheduling/ListAvailableSlotsController.js"
import { AVAILABILITY_RESPONSE_SCHEMA } from "../schemas/availabilitySchemas.js"
import { ID_PARAMS_SCHEMA } from "../schemas/commonSchemas.js"
import { PROVIDER_SUMMARY_SCHEMA } from "../schemas/providerSchemas.js"
import { SERVICE_SCHEMA } from "../schemas/serviceSchemas.js"
import { SLOTS_QUERY_SCHEMA, SLOTS_RESPONSE_SCHEMA } from "../schemas/slotSchemas.js"

export const providerRoutes: FastifyPluginAsyncZod = async (app) => {
  // ---------- Rotas públicas ----------

  app.get(
    "/",
    {
      schema: {
        tags: ["Providers"],
        summary: "Lista os prestadores",
        response: { 200: z.array(PROVIDER_SUMMARY_SCHEMA) },
      },
    },
    (req, rep) => new ListProvidersController().handle(req, rep)
  )

  app.get(
    "/:id/services",
    {
      schema: {
        tags: ["Providers"],
        summary: "Serviços ativos de um prestador",
        params: ID_PARAMS_SCHEMA,
        response: { 200: z.array(SERVICE_SCHEMA) },
      },
    },
    (req, rep) => new ListProviderServicesController().handle(req, rep)
  )

  app.get(
    "/:id/availability",
    {
      schema: {
        tags: ["Providers"],
        summary: "Semana de atendimento de um prestador",
        params: ID_PARAMS_SCHEMA,
        response: { 200: AVAILABILITY_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new GetProviderAvailabilityController().handle(req, rep)
  )

  app.get(
    "/:id/slots",
    {
      schema: {
        tags: ["Providers"],
        summary: "Horários livres de um prestador para um serviço num dia",
        params: ID_PARAMS_SCHEMA,
        querystring: SLOTS_QUERY_SCHEMA,
        response: { 200: SLOTS_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new ListAvailableSlotsController().handle(req, rep)
  )
}
