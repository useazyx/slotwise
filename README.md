# Slotwise

[![CI](https://github.com/useazyx/slotwise/actions/workflows/ci.yml/badge.svg)](https://github.com/useazyx/slotwise/actions/workflows/ci.yml)

Scheduling API for businesses that work by appointment: barbershops, nail studios, clinics.
Providers set their services and weekly hours, clients see the free slots and book one, and the
API schedules a reminder a day before and an hour before in a job queue that lives in PostgreSQL.

Leia em português: [README.pt-BR.md](README.pt-BR.md)

## Stack

- **Runtime:** Node.js 22, TypeScript
- **API:** Fastify 5, Zod 4 (validation and the OpenAPI docs come from the same schemas)
- **Data:** PostgreSQL, Prisma 6
- **Jobs:** pg-boss (queue and cron stored in PostgreSQL, no Redis)
- **Tests:** Vitest against a real PostgreSQL database, GitHub Actions

## Running it

You need Node.js 22.12+ and PostgreSQL running on `localhost:5432`.

```bash
npm install
npm run dev
```

`npm run dev` creates `.env` from `.env.example` (with a random JWT secret), creates the database,
applies the migrations, loads the demo data and starts the API on <http://localhost:3335>. The
interactive docs are at <http://localhost:3335/docs>.

If your Postgres user isn't `postgres/postgres`, change `DATABASE_URL` in `.env`.

### Demo accounts

All of them use the password `slotwise123`.

| Role     | Email              | What's there                                        |
|----------|--------------------|-----------------------------------------------------|
| Provider | `ze@slotwise.dev`   | Barbershop, 3 services, Tuesday to Saturday         |
| Provider | `bela@slotwise.dev` | Nail studio, 3 services, Monday to Friday           |
| Client   | `ana@slotwise.dev`  | Can book with either of them                        |

## Booking flow

```
GET  /providers                                   who is taking appointments
GET  /providers/:id/services                      what can be booked
GET  /providers/:id/slots?service_id=&date=       free times for that service on that day
POST /appointments  { provider_id, service_id, starts_at }
```

After that the client can list, cancel or reschedule, and the provider marks each appointment as
done or no-show.

## Decisions worth mentioning

- **Double booking is blocked twice.** The API only accepts a `starts_at` that is in the free slot
  list, and PostgreSQL has an exclusion constraint (`btree_gist` + `tstzrange`) so two scheduled
  appointments of the same provider can never overlap, even when two requests arrive at the same
  instant. Concurrent inserts against that constraint can deadlock, so the API retries and answers
  `409 SlotTaken` to whoever lost. A test fires five requests for the same slot and expects exactly
  one `201`.
- **Time zones.** Everything is stored in UTC. Slots are computed in the business time zone
  (`APP_TIMEZONE`) using only `Intl`, and the conversion is tested across a daylight saving change.
- **Reminders survive restarts.** Each reminder is a pg-boss job with `startAfter`, so it is a row
  in PostgreSQL and not a `setTimeout`. Canceling or rescheduling cancels the jobs, and the worker
  checks the appointment again before sending, so a stale job never reaches anyone. Delivery is a
  structured log for now; email or WhatsApp would only change `SendReminderService.deliver`.
- **Rescheduling is atomic.** The old appointment is canceled and the new one created in the same
  transaction, keeping the price agreed at booking time.
- **Daily agenda.** A pg-boss cron job builds each provider's agenda at 07:00 in the business time
  zone.
- **Rules in one place.** Booking notice, booking window, slot step and the client cancellation
  deadline live in `src/config/bookingRules.ts`.
- Login and sign up have their own rate limit, a wrong password and an unknown email get the same
  answer, and errors always come back as `{ error, message }`.

## API

| Group            | Routes                                                                       |
|------------------|------------------------------------------------------------------------------|
| `/auth`          | sign up, login, current user                                                 |
| `/services`      | provider's services: create, list mine, update, deactivate                   |
| `/availability`  | provider's weekly hours: replace the whole week, show mine                   |
| `/providers`     | public: list providers, their services, weekly hours and free slots          |
| `/appointments`  | book, list (paginated, filters), detail, cancel, reschedule, attendance      |

## Tests

```bash
npm test
```

The suites build the app with `buildApp()` and call it through `app.inject()`, against a
`slotwise_test` database that the global setup creates and migrates. Workers are off in tests; the
reminder and agenda handlers are called directly.

## Project structure

```
prisma/           schema, migrations (including the exclusion constraint) and seed
scripts/          setup-db.ts, used by npm run dev
src/
├── config/       env validation, Prisma, queue and booking rules
├── controllers/  one class per route, with handle()
├── services/     business rules, one class per use case, with execute()
├── jobs/         queue workers and the daily schedule
├── plugins/      auth, queue and security
├── routes/       route wiring and schemas
├── schemas/      Zod schemas for requests and responses
└── utils/        time zones, time helpers, passwords, database errors
tests/            API tests with Vitest
```

Code comments are in Portuguese.
