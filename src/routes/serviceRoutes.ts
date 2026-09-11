/**
 * serviceRoutes.ts - As rotas pro prestador cuidar dos próprios serviços
 * # Pra que serve?
 * - Criar, listar, alterar e desativar serviço
 * - Tudo aqui passa pelo porteiro e só aceita conta de prestador
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { CreateServiceController } from "../controllers/catalog/CreateServiceController.js"
import { DeactivateServiceController } from "../controllers/catalog/DeactivateServiceController.js"
import { ListMyServicesController } from "../controllers/catalog/ListMyServicesController.js"
import { UpdateServiceController } from "../controllers/catalog/UpdateServiceController.js"
import { ID_PARAMS_SCHEMA } from "../schemas/commonSchemas.js"
import {
  CREATE_SERVICE_BODY_SCHEMA,
  SERVICE_SCHEMA,
  UPDATE_SERVICE_BODY_SCHEMA,
} from "../schemas/serviceSchemas.js"

export const serviceRoutes: FastifyPluginAsyncZod = async (app) => {
  // ---------- Rotas privadas: só prestador ----------
  app.addHook("onRequest", app.authenticate)
  app.addHook("onRequest", app.requireRole("PROVIDER"))

  app.post(
    "/",
    {
      schema: {
        tags: ["Services"],
        summary: "Cadastra um serviço",
        security: [{ bearerAuth: [] }],
        body: CREATE_SERVICE_BODY_SCHEMA,
        response: { 201: SERVICE_SCHEMA },
      },
    },
    (req, rep) => new CreateServiceController().handle(req, rep)
  )

  app.get(
    "/mine",
    {
      schema: {
        tags: ["Services"],
        summary: "Lista os meus serviços, inclusive os desativados",
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(SERVICE_SCHEMA) },
      },
    },
    (req, rep) => new ListMyServicesController().handle(req, rep)
  )

  app.patch(
    "/:id",
    {
      schema: {
        tags: ["Services"],
        summary: "Altera um serviço",
        security: [{ bearerAuth: [] }],
        params: ID_PARAMS_SCHEMA,
        body: UPDATE_SERVICE_BODY_SCHEMA,
        response: { 200: SERVICE_SCHEMA },
      },
    },
    (req, rep) => new UpdateServiceController().handle(req, rep)
  )

  app.delete(
    "/:id",
    {
      schema: {
        tags: ["Services"],
        summary: "Desativa um serviço (o histórico continua)",
        security: [{ bearerAuth: [] }],
        params: ID_PARAMS_SCHEMA,
      },
    },
    (req, rep) => new DeactivateServiceController().handle(req, rep)
  )
}
