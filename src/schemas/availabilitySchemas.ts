/**
 * availabilitySchemas.ts - O formato da semana de atendimento do prestador
 * # Pra que serve?
 * - Validar as faixas de horário (dia da semana + começo + fim no formato HH:MM)
 * - Descrever a agenda semanal que sai nas respostas
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"
import { TIME_REGEX } from "../utils/time.js"

const TIME_SCHEMA = z.string().regex(TIME_REGEX, "Horário precisa estar no formato HH:MM (tipo 09:30)")

// weekday: 0 é domingo e 6 é sábado, igual ao Date.getDay() do JavaScript
export const AVAILABILITY_SLOT_SCHEMA = z.object({
  weekday: z.number().int().min(0, "Dia da semana vai de 0 (domingo) a 6 (sábado)").max(6),
  start: TIME_SCHEMA,
  end: TIME_SCHEMA,
})

export const REPLACE_AVAILABILITY_BODY_SCHEMA = z.object({
  slots: z.array(AVAILABILITY_SLOT_SCHEMA).max(50, "No máximo 50 faixas por semana"),
})

export const AVAILABILITY_RESPONSE_SCHEMA = z.object({
  provider_id: z.string(),
  slots: z.array(AVAILABILITY_SLOT_SCHEMA),
})

export type AvailabilitySlot = z.infer<typeof AVAILABILITY_SLOT_SCHEMA>
export type ReplaceAvailabilityBody = z.infer<typeof REPLACE_AVAILABILITY_BODY_SCHEMA>
