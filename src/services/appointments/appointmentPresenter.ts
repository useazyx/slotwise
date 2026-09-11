/**
 * appointmentPresenter.ts - Como um agendamento sai da API
 * # Pra que serve?
 * - Definir os campos que a gente busca no banco (com serviço, prestador e cliente juntos)
 * - Converter as datas pra texto ISO, que é o que o schema de resposta espera
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { Prisma } from "@prisma/client"

export const APPOINTMENT_SELECT = {
  id: true,
  status: true,
  starts_at: true,
  ends_at: true,
  price_cents: true,
  notes: true,
  canceled_at: true,
  cancel_reason: true,
  provider_id: true,
  client_id: true,
  service: { select: { id: true, name: true, duration_minutes: true } },
  provider: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentSelect

export type AppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof APPOINTMENT_SELECT }>

export function presentAppointment(appointment: AppointmentRecord) {
  return {
    id: appointment.id,
    status: appointment.status,
    starts_at: appointment.starts_at.toISOString(),
    ends_at: appointment.ends_at.toISOString(),
    price_cents: appointment.price_cents,
    notes: appointment.notes,
    canceled_at: appointment.canceled_at?.toISOString() ?? null,
    cancel_reason: appointment.cancel_reason,
    service: appointment.service,
    provider: appointment.provider,
    client: appointment.client,
  }
}
