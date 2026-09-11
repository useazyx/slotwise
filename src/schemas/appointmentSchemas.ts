/**
 * appointmentSchemas.ts - O formato dos agendamentos
 * # Pra que serve?
 * - Validar o pedido de marcação (prestador, serviço e o instante exato do horário)
 * - Validar listagem com filtro, cancelamento e remarcação
 * - Descrever como o agendamento sai nas respostas
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Listagem paginada, cancelamento e remarcação
 */

import { z } from "zod"
import { DATE_SCHEMA } from "./slotSchemas.js"

const STARTS_AT_SCHEMA = z.iso.datetime({ offset: true, message: "starts_at precisa ser uma data ISO com fuso" })

export const APPOINTMENT_STATUS_SCHEMA = z.enum(["SCHEDULED", "CANCELED", "DONE", "NO_SHOW"])

export const CREATE_APPOINTMENT_BODY_SCHEMA = z.object({
  provider_id: z.uuid("provider_id inválido"),
  service_id: z.uuid("service_id inválido"),
  // O mesmo starts_at que veio na lista de horários livres (ISO com fuso, tipo 2026-09-18T12:00:00.000Z)
  starts_at: STARTS_AT_SCHEMA,
  notes: z.string().trim().max(300, "Observação com no máximo 300 caracteres").optional(),
})

export const APPOINTMENT_SCHEMA = z.object({
  id: z.string(),
  status: APPOINTMENT_STATUS_SCHEMA,
  starts_at: z.string(),
  ends_at: z.string(),
  price_cents: z.number().int(),
  notes: z.string().nullable(),
  canceled_at: z.string().nullable(),
  cancel_reason: z.string().nullable(),
  service: z.object({ id: z.string(), name: z.string(), duration_minutes: z.number().int() }),
  provider: z.object({ id: z.string(), name: z.string() }),
  client: z.object({ id: z.string(), name: z.string() }),
})

// Filtros da listagem: from/to são dias de calendário no fuso do negócio
export const LIST_APPOINTMENTS_QUERY_SCHEMA = z.object({
  status: APPOINTMENT_STATUS_SCHEMA.optional(),
  from: DATE_SCHEMA.optional(),
  to: DATE_SCHEMA.optional(),
  page: z.coerce.number().int().min(1, "page começa em 1").default(1),
  page_size: z.coerce.number().int().min(1).max(100, "page_size vai até 100").default(20),
})

// Motivo é opcional, e dá pra mandar sem corpo nenhum (o Fastify entrega o corpo vazio como null)
export const CANCEL_APPOINTMENT_BODY_SCHEMA = z
  .object({
    reason: z.string().trim().max(300, "Motivo com no máximo 300 caracteres").optional(),
  })
  .nullish()

export const RESCHEDULE_APPOINTMENT_BODY_SCHEMA = z.object({
  starts_at: STARTS_AT_SCHEMA,
})

export const APPOINTMENT_LIST_RESPONSE_SCHEMA = z.object({
  appointments: z.array(APPOINTMENT_SCHEMA),
  total: z.number().int(),
  current_page: z.number().int(),
  total_pages: z.number().int(),
})

export type CreateAppointmentBody = z.infer<typeof CREATE_APPOINTMENT_BODY_SCHEMA>
export type ListAppointmentsQuery = z.infer<typeof LIST_APPOINTMENTS_QUERY_SCHEMA>
export type CancelAppointmentBody = z.infer<typeof CANCEL_APPOINTMENT_BODY_SCHEMA>
export type RescheduleAppointmentBody = z.infer<typeof RESCHEDULE_APPOINTMENT_BODY_SCHEMA>
