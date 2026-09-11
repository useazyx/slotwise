/**
 * CreateAppointmentService.ts - Marca um horário (a parte mais delicada da API)
 * # Pra que serve?
 * - Conferir que o horário pedido está na lista de horários livres (mesma regra que o cliente viu)
 * - Salvar o agendamento com uma cópia do preço do serviço
 * - Se duas pessoas pedirem o mesmo horário ao mesmo tempo, o banco segura a segunda
 *   (constraint appointments_no_overlap), e aqui isso vira um erro amigável
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Tenta de novo quando o Postgres acusa deadlock entre marcações simultâneas
 */

import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { isDeadlock, isOverlapViolation } from "../../utils/databaseErrors.js"
import { getZonedDate } from "../../utils/timezone.js"
import { ListAvailableSlotsService } from "../scheduling/ListAvailableSlotsService.js"
import { APPOINTMENT_SELECT, presentAppointment, type AppointmentRecord } from "./appointmentPresenter.js"

export const SLOT_UNAVAILABLE = "Horário indisponível"
export const SLOT_TAKEN = "Horário ocupado por outro agendamento"

// Quantas vezes tenta salvar quando dá deadlock (depois disso, alguém ficou com o horário)
const MAX_SAVE_ATTEMPTS = 3

// O que a gente precisa pra marcar:
interface CreateAppointmentRequest {
  client_id: string
  provider_id: string
  service_id: string
  starts_at: string
  notes?: string
}

export class CreateAppointmentService {
  async execute(data: CreateAppointmentRequest) {
    const startsAt = new Date(data.starts_at)

    // Checa na lista de livres: cobre dia de atendimento, antecedência, janela e horário já ocupado
    await this.ensureSlotIsFree(data.provider_id, data.service_id, startsAt)

    const service = await this.findService(data.service_id)
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000)

    const appointment = await this.saveAppointment({
      client_id: data.client_id,
      provider_id: data.provider_id,
      service_id: data.service_id,
      starts_at: startsAt,
      ends_at: endsAt,
      price_cents: service.price_cents,
      notes: data.notes,
    })

    return presentAppointment(appointment)
  }

  private async ensureSlotIsFree(providerId: string, serviceId: string, startsAt: Date) {
    const listAvailableSlotsService = new ListAvailableSlotsService()
    const { slots } = await listAvailableSlotsService.execute({
      provider_id: providerId,
      service_id: serviceId,
      date: getZonedDate(startsAt, env.APP_TIMEZONE),
    })

    // Compara o instante exato: 09:07 não existe na lista, então não passa
    const isFree = slots.some((slot) => slot.starts_at === startsAt.toISOString())
    if (!isFree) throw new Error(SLOT_UNAVAILABLE)
  }

  // A lista de livres já garantiu que o serviço existe, é do prestador e está ativo
  private async findService(serviceId: string) {
    return prisma.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { duration_minutes: true, price_cents: true },
    })
  }

  // Entre a checagem e o insert, outra requisição pode ter pego o horário: aí quem barra é o banco
  private async saveAppointment(
    data: {
      client_id: string
      provider_id: string
      service_id: string
      starts_at: Date
      ends_at: Date
      price_cents: number
      notes?: string
    },
    attempt = 1
  ): Promise<AppointmentRecord> {
    try {
      return await prisma.appointment.create({ data, select: APPOINTMENT_SELECT })
    } catch (error) {
      if (isOverlapViolation(error)) throw new Error(SLOT_TAKEN)

      // Inserts simultâneos na mesma constraint podem travar um no outro, e o Postgres derruba um deles.
      // Tentando de novo, ele esbarra na constraint (SLOT_TAKEN) ou passa, se o outro não foi adiante.
      if (isDeadlock(error)) {
        if (attempt >= MAX_SAVE_ATTEMPTS) throw new Error(SLOT_TAKEN)
        return this.saveAppointment(data, attempt + 1)
      }

      throw error
    }
  }
}
