-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "recipient" VARCHAR(255),
    "title" VARCHAR(255),
    "body" TEXT,
    "data" JSONB,
    "status" VARCHAR(20) DEFAULT 'pending',
    "sent_at" TIMESTAMP(6),
    "error" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "max_retries" INTEGER DEFAULT 3,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50),
    "token" VARCHAR(255) NOT NULL,
    "last_four" VARCHAR(4),
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "is_default" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "external_refund_id" VARCHAR(255),
    "gateway_response" JSONB,
    "job_id" VARCHAR(255),
    "processed_by_keycloak_id" VARCHAR(36),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_events" (
    "id" BIGSERIAL NOT NULL,
    "transaction_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_value" VARCHAR(50),
    "to_value" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "payment_method_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'VND',
    "description" TEXT,
    "status" VARCHAR(30) NOT NULL,
    "fraud_score" INTEGER,
    "fraud_decision" VARCHAR(20),
    "fraud_provider" VARCHAR(50),
    "fraud_checked_at" TIMESTAMP(6),
    "fraud_metadata" JSONB,
    "external_transaction_id" VARCHAR(255),
    "gateway_provider" VARCHAR(50),
    "gateway_response" JSONB,
    "job_id" VARCHAR(255),
    "ip_address" INET,
    "user_agent" TEXT,
    "device_id" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keycloak_id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'active',
    "kyc_verified" BOOLEAN DEFAULT false,
    "kyc_level" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "request_payload" JSONB,
    "score" INTEGER,
    "decision" VARCHAR(20),
    "response_payload" JSONB,
    "response_time_ms" INTEGER,
    "checked_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trigger_run_id" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "reference_id" UUID,
    "status" VARCHAR(20) DEFAULT 'queued',
    "priority" INTEGER DEFAULT 0,
    "attempts" INTEGER DEFAULT 0,
    "max_attempts" INTEGER DEFAULT 3,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "provider" VARCHAR(50),
    "provider_verification_id" VARCHAR(255),
    "provider_response" JSONB,
    "documents" JSONB,
    "verified_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(50) NOT NULL,
    "target_url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "http_status" INTEGER,
    "response_body" TEXT,
    "retry_count" INTEGER DEFAULT 0,
    "max_retries" INTEGER DEFAULT 5,
    "next_retry_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(6),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notifications_channel" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "idx_notifications_created" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_status" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_token_key" ON "payment_methods"("token");

-- CreateIndex
CREATE INDEX "idx_payment_methods_token" ON "payment_methods"("token");

-- CreateIndex
CREATE INDEX "idx_payment_methods_user" ON "payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "idx_payment_methods_status" ON "payment_methods"("status");

-- CreateIndex
CREATE INDEX "idx_refunds_status" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "idx_refunds_transaction" ON "refunds"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_refunds_created" ON "refunds"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_transaction_events_created" ON "transaction_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_transaction_events_txn" ON "transaction_events"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_transaction_events_type" ON "transaction_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_transactions_created" ON "transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_transactions_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_transactions_user" ON "transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_id_key" ON "users"("keycloak_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_keycloak" ON "users"("keycloak_id");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_fraud_audit_checked" ON "fraud_audit"("checked_at" DESC);

-- CreateIndex
CREATE INDEX "idx_fraud_audit_provider" ON "fraud_audit"("provider");

-- CreateIndex
CREATE INDEX "idx_fraud_audit_txn" ON "fraud_audit"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_trigger_run_id_key" ON "jobs"("trigger_run_id");

-- CreateIndex
CREATE INDEX "idx_jobs_created" ON "jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_jobs_reference" ON "jobs"("reference_id");

-- CreateIndex
CREATE INDEX "idx_jobs_status" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "idx_jobs_trigger_run" ON "jobs"("trigger_run_id");

-- CreateIndex
CREATE INDEX "idx_jobs_type" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "idx_kyc_level" ON "kyc_verifications"("level");

-- CreateIndex
CREATE INDEX "idx_kyc_status" ON "kyc_verifications"("status");

-- CreateIndex
CREATE INDEX "idx_kyc_user" ON "kyc_verifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_webhooks_created" ON "webhooks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_webhooks_event_type" ON "webhooks"("event_type");

-- CreateIndex
CREATE INDEX "idx_webhooks_status" ON "webhooks"("status");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
