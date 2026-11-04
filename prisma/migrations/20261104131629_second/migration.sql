-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('pending', 'active', 'suspended', 'deactivated');

-- CreateEnum
CREATE TYPE "LetterType" AS ENUM ('internal_inbox', 'internal_outbox', 'outside_inbox', 'outside_outbox');

-- CreateEnum
CREATE TYPE "LetterCondition" AS ENUM ('initial', 'response');

-- CreateEnum
CREATE TYPE "LetterSourceType" AS ENUM ('generated', 'uploaded', 'scanned');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('send', 'received', 'responded', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "FileRole" AS ENUM ('original', 'attachment', 'scan', 'generated_pdf', 'response');

-- CreateEnum
CREATE TYPE "CaptureMethod" AS ENUM ('upload', 'scanner', 'camera', 'generated');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('send', 'seen', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('direct', 'group', 'letter');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('new', 'assigned', 'in_progress', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "directories" (
    "directory_id" SERIAL NOT NULL,
    "directory_code" VARCHAR(30) NOT NULL,
    "directory_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_directory_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "directories_pkey" PRIMARY KEY ("directory_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "employee_number" VARCHAR(50),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" SERIAL NOT NULL,
    "permission_code" VARCHAR(100) NOT NULL,
    "permission_name" VARCHAR(150) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_permission_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_permission_id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "directory_id" INTEGER NOT NULL,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "letters" (
    "letter_id" SERIAL NOT NULL,
    "tracking_number" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "letter_content" TEXT,
    "source_type" "LetterSourceType" NOT NULL DEFAULT 'generated',
    "letter_type" "LetterType" NOT NULL,
    "letter_condition" "LetterCondition" NOT NULL DEFAULT 'initial',
    "template_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "received_by" INTEGER NOT NULL,
    "owning_directory_id" INTEGER NOT NULL,
    "received_directory_id" INTEGER NOT NULL,
    "stamp_id" INTEGER,
    "signature_id" INTEGER NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'send',
    "letter_date" DATE,
    "response_due_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(0),

    CONSTRAINT "letters_pkey" PRIMARY KEY ("letter_id")
);

-- CreateTable
CREATE TABLE "letter_files" (
    "file_id" SERIAL NOT NULL,
    "letter_id" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "file_role" "FileRole" NOT NULL,
    "capture_method" "CaptureMethod" NOT NULL DEFAULT 'upload',
    "page_number" INTEGER,
    "checksum_sha256" VARCHAR(64),
    "uploaded_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_files_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "letter_responses" (
    "response_id" SERIAL NOT NULL,
    "letter_id" INTEGER NOT NULL,
    "response_letter_id" INTEGER NOT NULL,
    "responded_by" INTEGER NOT NULL,
    "responding_directory_id" INTEGER NOT NULL,
    "response_status" "ResponseStatus" NOT NULL DEFAULT 'send',
    "responded_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_responses_pkey" PRIMARY KEY ("response_id")
);

-- CreateTable
CREATE TABLE "letter_templates" (
    "template_id" SERIAL NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "template_storage_key" VARCHAR(500),
    "directory_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "digital_signatures" (
    "signature_id" SERIAL NOT NULL,
    "signed_by" INTEGER NOT NULL,
    "signature_type" VARCHAR(50) NOT NULL,
    "signature_reference" VARCHAR(500),
    "signature_image_url" VARCHAR(500),
    "signed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "digital_signatures_pkey" PRIMARY KEY ("signature_id")
);

-- CreateTable
CREATE TABLE "stamps" (
    "stamp_id" SERIAL NOT NULL,
    "stamp_name" VARCHAR(150) NOT NULL,
    "stamp_image_url" VARCHAR(500) NOT NULL,
    "directory_id" INTEGER,
    "uploaded_by" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamps_pkey" PRIMARY KEY ("stamp_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "conversation_id" SERIAL NOT NULL,
    "conversation_type" "ConversationType" NOT NULL DEFAULT 'direct',
    "letter_id" INTEGER,
    "conversation_name" VARCHAR(255),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_member_id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(0),

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_member_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message_text" TEXT NOT NULL,
    "sent_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(0),
    "deleted_at" TIMESTAMP(0),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "attachment_id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size_bytes" BIGINT,
    "uploaded_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "related_letter_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(0),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "announcement_id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "published_at" TIMESTAMP(0),
    "expires_at" TIMESTAMP(0),
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "faq_id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100),
    "created_by" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("faq_id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "inquiry_id" SERIAL NOT NULL,
    "sender_name" VARCHAR(200) NOT NULL,
    "sender_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "inquiry_status" "InquiryStatus" NOT NULL DEFAULT 'new',
    "assigned_to" INTEGER,
    "submitted_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(0),

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("inquiry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "directories_directory_code_key" ON "directories"("directory_code");

-- CreateIndex
CREATE INDEX "directories_parent_directory_id_idx" ON "directories"("parent_directory_id");

-- CreateIndex
CREATE INDEX "directories_is_active_idx" ON "directories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_number_key" ON "users"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateIndex
CREATE INDEX "users_last_name_first_name_idx" ON "users"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_code_key" ON "permissions"("permission_code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_directory_id_is_active_idx" ON "user_role_assignments"("directory_id", "is_active");

-- CreateIndex
CREATE INDEX "user_role_assignments_user_id_is_active_idx" ON "user_role_assignments"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_id_idx" ON "user_role_assignments"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_user_id_role_id_directory_id_key" ON "user_role_assignments"("user_id", "role_id", "directory_id");

-- CreateIndex
CREATE UNIQUE INDEX "letters_tracking_number_key" ON "letters"("tracking_number");

-- CreateIndex
CREATE INDEX "letters_owning_directory_id_status_idx" ON "letters"("owning_directory_id", "status");

-- CreateIndex
CREATE INDEX "letters_received_directory_id_status_idx" ON "letters"("received_directory_id", "status");

-- CreateIndex
CREATE INDEX "letters_received_by_status_idx" ON "letters"("received_by", "status");

-- CreateIndex
CREATE INDEX "letters_created_by_idx" ON "letters"("created_by");

-- CreateIndex
CREATE INDEX "letters_letter_type_status_idx" ON "letters"("letter_type", "status");

-- CreateIndex
CREATE INDEX "letters_letter_condition_idx" ON "letters"("letter_condition");

-- CreateIndex
CREATE INDEX "letters_status_response_due_at_idx" ON "letters"("status", "response_due_at");

-- CreateIndex
CREATE INDEX "letters_letter_date_idx" ON "letters"("letter_date");

-- CreateIndex
CREATE INDEX "letters_created_at_idx" ON "letters"("created_at");

-- CreateIndex
CREATE INDEX "letters_template_id_idx" ON "letters"("template_id");

-- CreateIndex
CREATE INDEX "letters_stamp_id_idx" ON "letters"("stamp_id");

-- CreateIndex
CREATE INDEX "letters_signature_id_idx" ON "letters"("signature_id");

-- CreateIndex
CREATE INDEX "letter_files_letter_id_file_role_page_number_idx" ON "letter_files"("letter_id", "file_role", "page_number");

-- CreateIndex
CREATE INDEX "letter_files_uploaded_by_idx" ON "letter_files"("uploaded_by");

-- CreateIndex
CREATE INDEX "letter_responses_letter_id_response_status_idx" ON "letter_responses"("letter_id", "response_status");

-- CreateIndex
CREATE INDEX "letter_responses_response_letter_id_idx" ON "letter_responses"("response_letter_id");

-- CreateIndex
CREATE INDEX "letter_responses_responded_by_idx" ON "letter_responses"("responded_by");

-- CreateIndex
CREATE INDEX "letter_responses_responding_directory_id_idx" ON "letter_responses"("responding_directory_id");

-- CreateIndex
CREATE INDEX "letter_templates_directory_id_is_active_idx" ON "letter_templates"("directory_id", "is_active");

-- CreateIndex
CREATE INDEX "letter_templates_created_by_idx" ON "letter_templates"("created_by");

-- CreateIndex
CREATE INDEX "digital_signatures_signed_by_is_active_idx" ON "digital_signatures"("signed_by", "is_active");

-- CreateIndex
CREATE INDEX "stamps_directory_id_is_active_idx" ON "stamps"("directory_id", "is_active");

-- CreateIndex
CREATE INDEX "stamps_uploaded_by_idx" ON "stamps"("uploaded_by");

-- CreateIndex
CREATE INDEX "conversations_letter_id_idx" ON "conversations"("letter_id");

-- CreateIndex
CREATE INDEX "conversations_created_by_idx" ON "conversations"("created_by");

-- CreateIndex
CREATE INDEX "conversation_members_user_id_left_at_idx" ON "conversation_members"("user_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversation_id_user_id_key" ON "conversation_members"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- CreateIndex
CREATE INDEX "message_attachments_uploaded_by_idx" ON "message_attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "notifications_related_letter_id_idx" ON "notifications"("related_letter_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "announcements_status_published_at_idx" ON "announcements"("status", "published_at");

-- CreateIndex
CREATE INDEX "announcements_created_by_idx" ON "announcements"("created_by");

-- CreateIndex
CREATE INDEX "faqs_is_published_category_idx" ON "faqs"("is_published", "category");

-- CreateIndex
CREATE INDEX "contact_inquiries_inquiry_status_submitted_at_idx" ON "contact_inquiries"("inquiry_status", "submitted_at");

-- CreateIndex
CREATE INDEX "contact_inquiries_assigned_to_idx" ON "contact_inquiries"("assigned_to");

-- AddForeignKey
ALTER TABLE "directories" ADD CONSTRAINT "directories_parent_directory_id_fkey" FOREIGN KEY ("parent_directory_id") REFERENCES "directories"("directory_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_directory_id_fkey" FOREIGN KEY ("directory_id") REFERENCES "directories"("directory_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_owning_directory_id_fkey" FOREIGN KEY ("owning_directory_id") REFERENCES "directories"("directory_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_received_directory_id_fkey" FOREIGN KEY ("received_directory_id") REFERENCES "directories"("directory_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_stamp_id_fkey" FOREIGN KEY ("stamp_id") REFERENCES "stamps"("stamp_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "digital_signatures"("signature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "letter_templates"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_files" ADD CONSTRAINT "letter_files_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "letters"("letter_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_files" ADD CONSTRAINT "letter_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_responses" ADD CONSTRAINT "letter_responses_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "letters"("letter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_responses" ADD CONSTRAINT "letter_responses_response_letter_id_fkey" FOREIGN KEY ("response_letter_id") REFERENCES "letters"("letter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_responses" ADD CONSTRAINT "letter_responses_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_responses" ADD CONSTRAINT "letter_responses_responding_directory_id_fkey" FOREIGN KEY ("responding_directory_id") REFERENCES "directories"("directory_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_templates" ADD CONSTRAINT "letter_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_templates" ADD CONSTRAINT "letter_templates_directory_id_fkey" FOREIGN KEY ("directory_id") REFERENCES "directories"("directory_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_signatures" ADD CONSTRAINT "digital_signatures_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_directory_id_fkey" FOREIGN KEY ("directory_id") REFERENCES "directories"("directory_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "letters"("letter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_letter_id_fkey" FOREIGN KEY ("related_letter_id") REFERENCES "letters"("letter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
