/**
 * serviceSchemas.ts - O formato dos serviços que o prestador oferece
 * # Pra que serve?
 * - Validar criação e edição de serviço (nome, duração, preço)
 * - Descrever como o serviço sai nas respostas
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { z } from "zod"

const SERVICE_FIELDS = {
  name: z.string().trim().min(2, "Nome do serviço precisa de pelo menos 2 letras").max(80),
  description: z.string().trim().max(500).optional(),
  // Múltiplo de 5 pra agenda ficar redondinha (9:00, 9:05, 9:10...)
  duration_minutes: z
    .number()
    .int()
    .min(5, "Duração mínima é 5 minutos")
    .max(480, "Duração máxima é 8 horas")
    .multipleOf(5, "Duração precisa ser múltipla de 5 minutos"),
  // Em centavos: R$ 45,90 vira 4590
  price_cents: z.number().int().min(0, "Preço não pode ser negativo").max(1_000_000),
}

export const CREATE_SERVICE_BODY_SCHEMA = z.object(SERVICE_FIELDS)

export const UPDATE_SERVICE_BODY_SCHEMA = z
  .object({ ...SERVICE_FIELDS, active: z.boolean() })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Manda pelo menos um campo pra alterar")

export const SERVICE_SCHEMA = z.object({
  id: z.string(),
  provider_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number().int(),
  price_cents: z.number().int(),
  active: z.boolean(),
})

export type CreateServiceBody = z.infer<typeof CREATE_SERVICE_BODY_SCHEMA>
export type UpdateServiceBody = z.infer<typeof UPDATE_SERVICE_BODY_SCHEMA>
