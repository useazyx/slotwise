# Pontual

API de agendamento para negócios que trabalham com horário marcado: barbearia, manicure, clínica.
O prestador cadastra os serviços e a semana de atendimento, o cliente vê os horários livres e marca,
e a API agenda um lembrete um dia antes e outro uma hora antes, numa fila de jobs que fica no
próprio PostgreSQL.

## Tecnologias

- **Runtime:** Node.js 22, TypeScript
- **API:** Fastify 5, Zod 4 (a validação e a documentação OpenAPI saem dos mesmos schemas)
- **Dados:** PostgreSQL, Prisma 6
- **Jobs:** pg-boss (fila e cron guardados no PostgreSQL, sem Redis)
- **Testes:** Vitest com PostgreSQL de verdade, GitHub Actions

## Como rodar

Precisa de Node.js 22.12+ e PostgreSQL rodando em `localhost:5432`.

```bash
npm install
npm run dev
```

O `npm run dev` cria o `.env` a partir do `.env.example` (com um JWT secret aleatório), cria o
banco, aplica as migrations, carrega os dados de demonstração e sobe a API em
<http://localhost:3335>. A documentação interativa fica em <http://localhost:3335/docs>.

Se o seu usuário do Postgres não for `postgres/postgres`, ajuste o `DATABASE_URL` no `.env`.

### Contas de demonstração

Todas com a senha `pontual123`.

| Papel      | E-mail             | O que tem                                         |
|------------|--------------------|---------------------------------------------------|
| Prestador  | `ze@pontual.dev`   | Barbearia, 3 serviços, de terça a sábado          |
| Prestador  | `bela@pontual.dev` | Manicure, 3 serviços, de segunda a sexta          |
| Cliente    | `ana@pontual.dev`  | Pode marcar com qualquer um dos dois              |

## Fluxo de marcação

```
GET  /providers                                   quem está atendendo
GET  /providers/:id/services                      o que dá pra marcar
GET  /providers/:id/slots?service_id=&date=       horários livres daquele serviço no dia
POST /appointments  { provider_id, service_id, starts_at }
```

Depois o cliente lista, cancela ou remarca, e o prestador registra se o cliente veio ou faltou.

## Decisões de projeto

- **Marcação dupla é barrada duas vezes.** A API só aceita um `starts_at` que está na lista de
  livres, e o PostgreSQL tem uma exclusion constraint (`btree_gist` + `tstzrange`) que impede dois
  agendamentos ativos do mesmo prestador se cruzando, mesmo com duas requisições no mesmo instante.
  Inserts simultâneos nessa constraint podem dar deadlock, então a API tenta de novo e responde
  `409 SlotTaken` pra quem perdeu. Um teste dispara cinco pedidos pro mesmo horário e espera
  exatamente um `201`.
- **Fuso horário.** Tudo fica em UTC no banco. Os horários livres são calculados no fuso do negócio
  (`APP_TIMEZONE`) só com `Intl`, e a conversão é testada numa virada de horário de verão.
- **Lembrete sobrevive a reinício.** Cada lembrete é um job do pg-boss com `startAfter`, ou seja,
  uma linha no PostgreSQL e não um `setTimeout`. Cancelar ou remarcar cancela os jobs, e o worker
  confere o agendamento de novo antes de avisar. A entrega hoje é um log estruturado; e-mail ou
  WhatsApp mexeriam só no `SendReminderService.deliver`.
- **Remarcação atômica.** O agendamento antigo é cancelado e o novo criado na mesma transação,
  mantendo o preço combinado na marcação.
- **Agenda do dia.** Um cron do pg-boss monta a agenda de cada prestador às 07:00 no fuso do
  negócio.
- **Regras num lugar só.** Antecedência mínima, janela de agendamento, intervalo entre horários e
  prazo de cancelamento do cliente ficam em `src/config/bookingRules.ts`.
- Login e cadastro têm rate limit próprio, senha errada e e-mail inexistente recebem a mesma
  resposta, e todo erro volta como `{ error, message }`.

## Testes

```bash
npm test
```

Os testes montam a aplicação com `buildApp()` e chamam pelo `app.inject()`, num banco
`pontual_test` que o setup global cria e migra. Os workers ficam desligados nos testes; os handlers
de lembrete e de agenda são chamados direto.
