/**
 * bookingRules.ts - As regras de agenda num lugar só
 * # Pra que serve?
 * - Deixar à vista quanto antes dá pra marcar, até quando e de quanto em quanto tempo os horários andam
 * - Se o negócio quiser mudar uma regra, muda aqui e vale pra API toda
 * Feito por: Arthur Roberto Weege Pontes
 * Versão: 1.0.0
 * Data: 2026-09-11
 * Alterações:
 * - v1.0.0 (2026-09-11): Implementação inicial
 */

// Os horários livres andam de 15 em 15 minutos (09:00, 09:15, 09:30...)
export const SLOT_STEP_MINUTES = 15

// Não dá pra marcar em cima da hora: precisa de pelo menos 30 minutos de antecedência
export const MIN_BOOKING_NOTICE_MINUTES = 30

// E também não dá pra marcar pra daqui a um ano
export const MAX_BOOKING_DAYS_AHEAD = 60

// Cliente só cancela até 2 horas antes (prestador cancela quando quiser)
export const CLIENT_CANCEL_NOTICE_MINUTES = 120
