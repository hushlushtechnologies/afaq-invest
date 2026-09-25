-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PermissionResource" AS ENUM ('DASHBOARD', 'INVESTOR', 'KYC', 'COMPANY', 'PARTNER', 'OPPORTUNITY', 'INVESTMENT_RULE', 'INVESTMENT_REQUEST', 'FINANCE', 'DOCUMENT', 'REPORT', 'STAFF', 'ROLE', 'PERMISSION', 'SETTINGS', 'AUDIT');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'MANAGE', 'EXPORT');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTH', 'STAFF', 'ROLE', 'PERMISSION', 'SECURITY', 'SETTINGS');

-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'INVITATION_SENT', 'INVITATION_ACCEPTED', 'SESSION_REVOKED');

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "job_title" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "status" "StaffStatus" NOT NULL DEFAULT 'INVITED',
    "preferred_locale" TEXT NOT NULL DEFAULT 'en',
    "invited_at" TIMESTAMP(3),
    "invitation_expires_at" TIMESTAMP(3),
    "invitation_sent_count" INTEGER NOT NULL DEFAULT 0,
    "invited_by_id" UUID,
    "activated_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "staff_user_roles" (
    "staff_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" UUID,

    CONSTRAINT "staff_user_roles_pkey" PRIMARY KEY ("staff_user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_staff_user_id" UUID,
    "actor_email" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "target_label" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_activities" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staff_user_id" UUID,
    "email" TEXT NOT NULL,
    "event" "AuthEventType" NOT NULL,
    "succeeded" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_label" TEXT,

    CONSTRAINT "auth_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_auth_user_id_key" ON "staff_users"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE INDEX "staff_users_status_idx" ON "staff_users"("status");

-- CreateIndex
CREATE INDEX "staff_users_email_idx" ON "staff_users"("email");

-- CreateIndex
CREATE INDEX "staff_users_last_login_at_idx" ON "staff_users"("last_login_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "roles_is_system_idx" ON "roles"("is_system");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_resource_idx" ON "permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "staff_user_roles_role_id_idx" ON "staff_user_roles"("role_id");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_category_occurred_at_idx" ON "audit_logs"("category", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_staff_user_id_idx" ON "audit_logs"("actor_staff_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "auth_activities_occurred_at_idx" ON "auth_activities"("occurred_at");

-- CreateIndex
CREATE INDEX "auth_activities_staff_user_id_occurred_at_idx" ON "auth_activities"("staff_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "auth_activities_email_occurred_at_idx" ON "auth_activities"("email", "occurred_at");

-- CreateIndex
CREATE INDEX "auth_activities_event_occurred_at_idx" ON "auth_activities"("event", "occurred_at");

-- AddForeignKey
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user_roles" ADD CONSTRAINT "staff_user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_staff_user_id_fkey" FOREIGN KEY ("actor_staff_user_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_activities" ADD CONSTRAINT "auth_activities_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
