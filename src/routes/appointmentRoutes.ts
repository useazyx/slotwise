/**
 * appointmentRoutes.ts - As rotas de agendamento
 * # Pra que serve?
 * - Marcar horário (só cliente)
 * - Tudo aqui passa pelo porteiro
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { CreateAppointmentController } from "../controllers/appointments/CreateAppointmentController.js"
import { APPOINTMENT_SCHEMA, CREATE_APPOINTMENT_BODY_SCHEMA } from "../schemas/appointmentSchemas.js"

export const appointmentRoutes: FastifyPluginAsyncZod = async (app) => {
  // ---------- Rotas privadas ----------
  app.addHook("onRequest", app.authenticate)

  app.post(
    "/",
    {
      onRequest: [app.requireRole("CLIENT")],
      schema: {
        tags: ["Appointments"],
        summary: "Marca um horário",
        security: [{ bearerAuth: [] }],
        body: CREATE_APPOINTMENT_BODY_SCHEMA,
        response: { 201: APPOINTMENT_SCHEMA },
      },
    },
    (req, rep) => new CreateAppointmentController().handle(req, rep)
  )
}
