/**
 * appointmentSchemas.ts - O formato dos agendamentos
 * # Pra que serve?
 * - Validar o pedido de marcação (prestador, serviço e o instante exato do horário)
 * - Descrever como o agendamento sai nas respostas
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"

export const APPOINTMENT_STATUS_SCHEMA = z.enum(["SCHEDULED", "CANCELED", "DONE", "NO_SHOW"])

export const CREATE_APPOINTMENT_BODY_SCHEMA = z.object({
  provider_id: z.uuid("provider_id inválido"),
  service_id: z.uuid("service_id inválido"),
  // O mesmo starts_at que veio na lista de horários livres (ISO com fuso, tipo 2026-09-18T12:00:00.000Z)
  starts_at: z.iso.datetime({ offset: true, message: "starts_at precisa ser uma data ISO com fuso" }),
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

export type CreateAppointmentBody = z.infer<typeof CREATE_APPOINTMENT_BODY_SCHEMA>
