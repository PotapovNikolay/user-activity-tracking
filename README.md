# User Activity Tracking

NestJS-приложение для хранения пользователей и трекинга их активности.

В проекте есть:

- `api` для чтения профиля и активности пользователя за период;
- `scheduler` для постановки задач по cron;
- `worker` для фоновой обработки очереди;
- `PostgreSQL` как основная база данных;
- `Redis + BullMQ` как очередь;
- `Docker Compose` для локального запуска всего стека.

## Архитектура

Текущий `v1` собран как модульный монолит с асинхронной фоновой обработкой:

- одна кодовая база;
- три runtime-роли: `api`, `worker`, `scheduler`;
- доменные модули `users` и `activity`;
- инфраструктурный слой `infrastructure/queue`, `infrastructure/scheduler`, `infrastructure/logging`;
- append-only записи активности в PostgreSQL;
- cron pipeline вида `scheduler → queue → worker → database`.

Подробности: [docs/architecture.md](./docs/architecture.md)

## Текущий стек

- `NestJS 11`
- `Node.js 22`
- `Prisma 7`
- `@prisma/adapter-pg` для runtime-подключения Prisma
- `PostgreSQL 16`
- `Redis 7`
- `BullMQ 5`
- `class-validator` + `class-transformer` для env validation и HTTP DTO
- `nestjs-pino` для структурированных логов
- `Swagger` на `/docs`
- `GitHub Actions` для базового CI

## Структура проекта

```text
src/
├─ app.module.ts
├─ worker-app.module.ts
├─ scheduler-app.module.ts
├─ main.ts
├─ main-worker.ts
├─ main-scheduler.ts
├─ config/
│  ├─ app-config.module.ts
│  ├─ app-config.service.ts
│  ├─ configuration.ts
│  ├─ env.constants.ts
│  ├─ env.validation.ts
│  └─ contracts/
├─ database/
│  ├─ database.module.ts
│  └─ prisma.service.ts
├─ infrastructure/
│  ├─ logging/
│  ├─ queue/
│  └─ scheduler/
├─ modules/
│  ├─ activity/
│  │  ├─ api/
│  │  ├─ application/
│  │  ├─ domain/
│  │  ├─ infrastructure/
│  │  │  └─ queue/
│  │  ├─ activity.module.ts
│  │  ├─ activity-worker.module.ts
│  │  ├─ activity-queue.module.ts
│  │  └─ activity.public.ts
│  └─ users/
│     ├─ api/
│     ├─ application/
│     ├─ domain/
│     ├─ infrastructure/
│     ├─ users.module.ts
│     └─ users.public.ts
├─ common/
│  ├─ date/
│  └─ validation/
├─ health/
└─ shared/
   └─ kernel/
```

Дополнительно:

```text
prisma/
├─ schema.prisma
├─ seed.mjs
└─ migrations/

docker/
└─ app.Dockerfile

docker-compose.yml

test/
├─ unit/
├─ integration/
└─ app.e2e-spec.ts
```

## Переменные окружения

| Переменная | Назначение | Default |
| --- | --- | --- |
| `NODE_ENV` | Режим запуска (`development` / `production` / `test`) | `development` |
| `APP_PORT` | HTTP-порт `api` | `3000` |
| `LOG_LEVEL` | Уровень логирования pino (`debug`, `info`, `warn`, `error`) | `info` |
| `DATABASE_URL` | Строка подключения к PostgreSQL | см. `.env.example` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Параметры контейнера PostgreSQL в Docker Compose | `user_activity_tracking` / `app` / `app` |
| `REDIS_HOST` / `REDIS_PORT` | Подключение к Redis для BullMQ | `localhost` / `6379` |
| `SCHEDULER_CRON` | Cron-выражение для запуска fan-out | `* * * * *` |
| `SCHEDULER_BATCH_SIZE` | Размер батча при постановке jobs | `50` |
| `ACTIVITY_MAX_PERIOD_DAYS` | Максимальный период выборки activity API | `31` |

См. [.env.example](./.env.example)

## Требования

- Node.js 22
- npm 10+
- Docker и Docker Compose (для локальной инфраструктуры)

## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. `.env` не обязателен. Приложение может стартовать на значениях по умолчанию из конфигурации; при дефолтах ожидается PostgreSQL на `localhost:5432` и Redis на `localhost:6379`.

Если нужно переопределить настройки, можно скопировать `.env.example` в `.env` и изменить значения.

3. Поднять PostgreSQL и Redis (например, через Docker Compose):

```bash
docker compose up -d postgres redis
```

4. Сгенерировать Prisma client и применить миграции:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
```

5. Запустить API:

```bash
npm run start:dev
```

При необходимости отдельные runtime можно поднимать так:

```bash
npm run start:worker:dev
npm run start:scheduler:dev
```

## Запуск через Docker Compose

```bash
docker compose up --build
```

`migrate` сервис отдельно применяет Prisma migrations и выполняет seed до старта `api`, `worker` и `scheduler`.

## API и служебные endpoints

OpenAPI-описание находится в [docs/openapi.yaml](./docs/openapi.yaml).

- `GET /health/liveness`
- `GET /health/readiness`
- `GET /docs`
- `GET /users/:id`
- `GET /users/:userId/activity?from=...&to=...&type=...&limit=...&cursor=...`

## Основные команды

```bash
npm run build
npm run lint:check
npm run lint
npm test -- --runInBand
npm run test:e2e
npm run test:integration
npm run prisma:generate
npm run prisma:migrate:deploy
npm run start:prod
npm run start:worker
npm run start:scheduler
```

## Как проверить, что cron → queue → worker → DB работает

После `docker compose up --build`:

1. Подождать первый тик cron (по умолчанию каждую минуту). В логах `scheduler` появится:
   ```
   Starting paged activity job fan-out  { batchSize: 50 }
   Finished paged enqueueing of activity generation jobs  { enqueued: N, ... }
   ```

2. В логах `worker` появится:
   ```
   Processed activity generation job  { userId: "...", activityType: "..." }
   ```

3. Проверить через API. Seed создаёт пользователей `alice@example.com` и `bob@example.com`, их UUID можно посмотреть через Prisma Studio (`npx prisma studio`) или напрямую в БД:
   ```bash
   curl "http://localhost:3000/users/<userId>/activity?from=2026-04-12T00:00:00Z&to=2026-04-19T23:59:59Z&limit=50"
   ```
   Подставь актуальные даты в `from`/`to` (ISO 8601, UTC). Данные seed-пользователей описаны в [prisma/seed.mjs](./prisma/seed.mjs).

Подробности по параметрам `GET /users/:userId/activity`, пагинации и примерам ответов см. в [docs/openapi.yaml](./docs/openapi.yaml).

## Тесты и CI

В проекте есть:

- unit-тесты на validation, scheduler и activity use cases;
- e2e-тесты на health endpoint и shape validation для activity query;
- integration-тесты с реальными `PostgreSQL + Redis + BullMQ` через `testcontainers`;
- GitHub Actions workflow с отдельными `quality` и `integration` jobs.

## Ограничения v1

**Auth намеренно отсутствует.** API трактуется как internal/service-to-service. Добавление auth (JWT guard + `@CurrentUser()` декоратор) — следующий шаг, структура модулей его не затрудняет.

**Scheduler — single-instance.** При запуске нескольких экземпляров scheduler'а каждый будет постить jobs независимо. Для HA-сценария нужен distributed lock (например, Redlock). Текущая конфигурация Docker Compose предполагает одну реплику scheduler.

**Fan-out ограничен постраничным обходом.** Scheduler читает активных пользователей страницами по `SCHEDULER_BATCH_SIZE` (по умолчанию 50) и ставит jobs page-by-page, не загружая весь набор пользователей в память за один cron tick.

**Queue retry policy.** Только retriable (транзиентные) ошибки попадают под retry. `NotFoundException` (пользователь удалён) и невалидный payload завершаются как `UnrecoverableError` — job уходит в dead letter без retry.

Dead letter хранится в отдельной BullMQ queue `user-activity-generation-dlq`, чтобы payload и причина отказа не терялись после cleanup основной очереди.

**Idempotent activity writes.** Для системно сгенерированной активности действует уникальность `(userId, source, type, endedAt)`. Это защищает от повторной обработки одного и того же scheduled job на уровне БД, а не только очереди.

**Scheduler read-path index.** Для fan-out активных пользователей добавлен индекс `(is_active, created_at, id)`, чтобы keyset/paged обход scheduler'а не деградировал в sequential scan при росте таблицы `users`.

**Активность генерируется синтетически.** `worker` создаёт рандомизированные данные (`steps`, `calories`, `distanceMeters`, `avgHeartRate`, `maxHeartRate`).

**Нет метрик и трейсинга.** Observability ограничена структурированными JSON-логами (pino) и health endpoints. Prometheus / OpenTelemetry — за рамками текущего scope.
