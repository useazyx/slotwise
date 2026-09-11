/**
 * slotSchemas.ts - O formato da busca por horários livres
 * # Pra que serve?
 * - Validar qual serviço e qual dia o cliente quer ver
 * - Descrever a lista de horários que sai (com o instante UTC e a hora local pra mostrar na tela)
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"
import { isValidCalendarDate } from "../utils/timezone.js"

export const DATE_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data precisa estar no formato AAAA-MM-DD")
  .refine(isValidCalendarDate, "Essa data não existe no calendário")

export const SLOTS_QUERY_SCHEMA = z.object({
  service_id: z.uuid("service_id inválido"),
  date: DATE_SCHEMA,
})

export const SLOT_SCHEMA = z.object({
  starts_at: z.string(),
  ends_at: z.string(),
  local_time: z.string(),
})

export const SLOTS_RESPONSE_SCHEMA = z.object({
  date: z.string(),
  timezone: z.string(),
  service: z.object({ id: z.string(), name: z.string(), duration_minutes: z.number().int() }),
  slots: z.array(SLOT_SCHEMA),
})

export type SlotsQuery = z.infer<typeof SLOTS_QUERY_SCHEMA>
