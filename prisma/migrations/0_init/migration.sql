CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "summary" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activities_duration_seconds_positive"
        CHECK ("duration_seconds" > 0),
    CONSTRAINT "activities_ended_at_after_started_at"
        CHECK ("ended_at" > "started_at")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_is_active_created_at_id_idx"
ON "users"("is_active", "created_at" ASC, "id" ASC);

CREATE UNIQUE INDEX "activities_user_id_source_type_ended_at_key"
ON "activities"("user_id", "source", "type", "ended_at");

CREATE INDEX "activities_user_id_started_at_id_idx"
ON "activities"("user_id", "started_at" DESC, "id" DESC);

CREATE INDEX "activities_user_id_type_started_at_id_idx"
ON "activities"("user_id", "type", "started_at" DESC, "id" DESC);

ALTER TABLE "activities"
ADD CONSTRAINT "activities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
