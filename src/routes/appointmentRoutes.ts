/**
 * appointmentRoutes.ts - As rotas de agendamento
 * # Pra que serve?
 * - Marcar e remarcar horário (só cliente)
 * - Ver a agenda, ver um agendamento e cancelar (cliente e prestador)
 * - Tudo aqui passa pelo porteiro
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Listagem, detalhe, cancelamento e remarcação
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { CancelAppointmentController } from "../controllers/appointments/CancelAppointmentController.js"
import { CreateAppointmentController } from "../controllers/appointments/CreateAppointmentController.js"
import { GetAppointmentController } from "../controllers/appointments/GetAppointmentController.js"
import { ListAppointmentsController } from "../controllers/appointments/ListAppointmentsController.js"
import { RescheduleAppointmentController } from "../controllers/appointments/RescheduleAppointmentController.js"
import {
  APPOINTMENT_LIST_RESPONSE_SCHEMA,
  APPOINTMENT_SCHEMA,
  CANCEL_APPOINTMENT_BODY_SCHEMA,
  CREATE_APPOINTMENT_BODY_SCHEMA,
  LIST_APPOINTMENTS_QUERY_SCHEMA,
  RESCHEDULE_APPOINTMENT_BODY_SCHEMA,
} from "../schemas/appointmentSchemas.js"
import { ID_PARAMS_SCHEMA } from "../schemas/commonSchemas.js"

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

  app.get(
    "/",
    {
      schema: {
        tags: ["Appointments"],
        summary: "Minha agenda (cliente vê o que marcou, prestador vê o que vai atender)",
        security: [{ bearerAuth: [] }],
        querystring: LIST_APPOINTMENTS_QUERY_SCHEMA,
        response: { 200: APPOINTMENT_LIST_RESPONSE_SCHEMA },
      },
    },
    (req, rep) => new ListAppointmentsController().handle(req, rep)
  )

  app.get(
    "/:id",
    {
      schema: {
        tags: ["Appointments"],
        summary: "Detalhe de um agendamento",
        security: [{ bearerAuth: [] }],
        params: ID_PARAMS_SCHEMA,
        response: { 200: APPOINTMENT_SCHEMA },
      },
    },
    (req, rep) => new GetAppointmentController().handle(req, rep)
  )

  app.patch(
    "/:id/cancel",
    {
      schema: {
        tags: ["Appointments"],
        summary: "Cancela um agendamento",
        security: [{ bearerAuth: [] }],
        params: ID_PARAMS_SCHEMA,
        body: CANCEL_APPOINTMENT_BODY_SCHEMA,
        response: { 200: APPOINTMENT_SCHEMA },
      },
    },
    (req, rep) => new CancelAppointmentController().handle(req, rep)
  )

  app.patch(
    "/:id/reschedule",
    {
      onRequest: [app.requireRole("CLIENT")],
      schema: {
        tags: ["Appointments"],
        summary: "Troca o horário de um agendamento",
        security: [{ bearerAuth: [] }],
        params: ID_PARAMS_SCHEMA,
        body: RESCHEDULE_APPOINTMENT_BODY_SCHEMA,
        response: { 200: APPOINTMENT_SCHEMA },
      },
    },
    (req, rep) => new RescheduleAppointmentController().handle(req, rep)
  )
}
