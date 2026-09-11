/**
 * RescheduleAppointmentService.ts - Troca o horário de um agendamento do cliente
 * # Pra que serve?
 * - Conferir o horário novo na lista de livres, sem contar o próprio horário antigo como ocupado
 * - Cancelar o antigo e criar o novo na mesma transação (ou troca tudo, ou nada muda)
 * - Manter o preço combinado na primeira marcação, mesmo que o serviço tenha ficado mais caro
 * - Levar os lembretes pro horário novo
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.1.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 * - v1.1.0 (2026-09-11): Cancela os lembretes do horário antigo e agenda os do novo
 */

import { CLIENT_CANCEL_NOTICE_MINUTES } from "../../config/bookingRules.js"
import { env } from "../../config/env.js"
import { prisma } from "../../config/prisma.js"
import { isDeadlock, isOverlapViolation } from "../../utils/databaseErrors.js"
import { getZonedDate } from "../../utils/timezone.js"
import { CancelRemindersService } from "../reminders/CancelRemindersService.js"
import { ScheduleRemindersService } from "../reminders/ScheduleRemindersService.js"
import { ListAvailableSlotsService } from "../scheduling/ListAvailableSlotsService.js"
import { APPOINTMENT_SELECT, presentAppointment, type AppointmentRecord } from "./appointmentPresenter.js"
import { APPOINTMENT_NOT_ACTIVE, TOO_LATE_TO_CHANGE } from "./CancelAppointmentService.js"
import { SLOT_TAKEN, SLOT_UNAVAILABLE } from "./CreateAppointmentService.js"
import { APPOINTMENT_NOT_FOUND } from "./GetAppointmentService.js"

export const SAME_TIME = "Horário novo igual ao atual"

const RESCHEDULE_REASON = "Remarcado pelo cliente"
const MAX_SWAP_ATTEMPTS = 3

// O que a gente precisa pra remarcar:
interface RescheduleAppointmentRequest {
  appointment_id: string
  client_id: string
  starts_at: string
}

export class RescheduleAppointmentService {
  async execute({ appointment_id, client_id, starts_at }: RescheduleAppointmentRequest) {
    const current = await this.findClientAppointment(appointment_id, client_id)
    const newStart = new Date(starts_at)

    if (current.status !== "SCHEDULED") throw new Error(APPOINTMENT_NOT_ACTIVE)
    this.ensureNotice(current.starts_at)
    if (newStart.getTime() === current.starts_at.getTime()) throw new Error(SAME_TIME)

    await this.ensureSlotIsFree(current, newStart)

    const replacement = await this.swapAppointments(current, newStart)

    await this.moveReminders(current.id, replacement.id, replacement.starts_at)

    return presentAppointment(replacement)
  }

  // Lembrete do horário antigo não pode sair; o novo horário ganha os dele
  private async moveReminders(oldAppointmentId: string, newAppointmentId: string, newStart: Date) {
    const cancelRemindersService = new CancelRemindersService()
    await cancelRemindersService.execute(oldAppointmentId)

    try {
      const scheduleRemindersService = new ScheduleRemindersService()
      await scheduleRemindersService.execute({ appointment_id: newAppointmentId, starts_at: newStart })
    } catch (error) {
      console.error("❌ Deu ruim agendando os lembretes do horário novo:", error)
    }
  }

  private async findClientAppointment(appointmentId: string, clientId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, client_id: clientId },
      select: {
        id: true,
        status: true,
        starts_at: true,
        ends_at: true,
        price_cents: true,
        notes: true,
        client_id: true,
        provider_id: true,
        service_id: true,
      },
    })

    if (!appointment) throw new Error(APPOINTMENT_NOT_FOUND)
    return appointment
  }

  // Mesma regra do cancelamento: remarcar em cima da hora deixa o prestador com buraco na agenda
  private ensureNotice(startsAt: Date) {
    const minutesUntilStart = (startsAt.getTime() - Date.now()) / 60_000
    if (minutesUntilStart < CLIENT_CANCEL_NOTICE_MINUTES) throw new Error(TOO_LATE_TO_CHANGE)
  }

  private async ensureSlotIsFree(
    current: { id: string; provider_id: string; service_id: string },
    newStart: Date
  ) {
    const listAvailableSlotsService = new ListAvailableSlotsService()
    const { slots } = await listAvailableSlotsService.execute({
      provider_id: current.provider_id,
      service_id: current.service_id,
      date: getZonedDate(newStart, env.APP_TIMEZONE),
      ignore_appointment_id: current.id,
    })

    const isFree = slots.some((slot) => slot.starts_at === newStart.toISOString())
    if (!isFree) throw new Error(SLOT_UNAVAILABLE)
  }

  // Cancela o antigo ANTES de criar o novo, dentro da transação: assim a constraint não enxerga
  // o horário antigo como ocupado, e se o novo falhar o antigo volta a valer
  private async swapAppointments(
    current: Awaited<ReturnType<RescheduleAppointmentService["findClientAppointment"]>>,
    newStart: Date,
    attempt = 1
  ): Promise<AppointmentRecord> {
    const durationMs = current.ends_at.getTime() - current.starts_at.getTime()

    try {
      return await prisma.$transaction(async (tx) => {
        const { count } = await tx.appointment.updateMany({
          where: { id: current.id, status: "SCHEDULED" },
          data: { status: "CANCELED", canceled_at: new Date(), cancel_reason: RESCHEDULE_REASON },
        })

        if (count === 0) throw new Error(APPOINTMENT_NOT_ACTIVE)

        return tx.appointment.create({
          data: {
            client_id: current.client_id,
            provider_id: current.provider_id,
            service_id: current.service_id,
            starts_at: newStart,
            ends_at: new Date(newStart.getTime() + durationMs),
            price_cents: current.price_cents,
            notes: current.notes,
          },
          select: APPOINTMENT_SELECT,
        })
      })
    } catch (error) {
      if (isOverlapViolation(error)) throw new Error(SLOT_TAKEN)

      // Mesmo caso da marcação: deadlock entre transações simultâneas, então tenta de novo
      if (isDeadlock(error)) {
        if (attempt >= MAX_SWAP_ATTEMPTS) throw new Error(SLOT_TAKEN)
        return this.swapAppointments(current, newStart, attempt + 1)
      }

      throw error
    }
  }
}
