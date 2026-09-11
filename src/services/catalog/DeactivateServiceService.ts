/**
 * DeactivateServiceService.ts - Tira um serviço de circulação
 * # Pra que serve?
 * - "Apagar" sem apagar: o serviço some pros clientes, mas o histórico de agendamentos continua de pé
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

import { prisma } from "../../config/prisma.js"
import { SERVICE_NOT_FOUND } from "./UpdateServiceService.js"

export class DeactivateServiceService {
  async execute(id: string, providerId: string) {
    // updateMany com o dono no filtro: se não for dele, não atualiza nada
    const { count } = await prisma.service.updateMany({
      where: { id, provider_id: providerId },
      data: { active: false },
    })

    if (count === 0) throw new Error(SERVICE_NOT_FOUND)
  }
}
