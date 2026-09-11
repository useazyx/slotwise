/**
 * CreateServiceService.ts - Cadastra um serviço novo do prestador
 * # Pra que serve?
 * - Salvar nome, duração e preço de um serviço ligado ao prestador logado
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "../../config/prisma.js"

// Os campos de serviço que saem nas respostas
export const SERVICE_SELECT = {
  id: true,
  provider_id: true,
  name: true,
  description: true,
  duration_minutes: true,
  price_cents: true,
  active: true,
} satisfies Prisma.ServiceSelect

// O que a gente precisa pra criar:
interface CreateServiceRequest {
  provider_id: string
  name: string
  description?: string
  duration_minutes: number
  price_cents: number
}

export class CreateServiceService {
  async execute(data: CreateServiceRequest) {
    return prisma.service.create({ data, select: SERVICE_SELECT })
  }
}
