-- CreateTable
CREATE TABLE `directories` (
    `directory_id` INTEGER NOT NULL AUTO_INCREMENT,
    `directory_code` VARCHAR(30) NOT NULL,
    `directory_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `parent_directory_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `directories_directory_code_key`(`directory_code`),
    INDEX `directories_parent_directory_id_idx`(`parent_directory_id`),
    INDEX `directories_is_active_idx`(`is_active`),
    PRIMARY KEY (`directory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_number` VARCHAR(50) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `account_status` ENUM('pending', 'active', 'suspended', 'deactivated') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `users_employee_number_key`(`employee_number`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_account_status_idx`(`account_status`),
    INDEX `users_last_name_first_name_idx`(`last_name`, `first_name`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `permission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `permission_code` VARCHAR(100) NOT NULL,
    `permission_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `permissions_permission_code_key`(`permission_code`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_permission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`role_permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role_assignments` (
    `assignment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `directory_id` INTEGER NOT NULL,
    `assigned_by` INTEGER NULL,
    `assigned_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `user_role_assignments_directory_id_is_active_idx`(`directory_id`, `is_active`),
    INDEX `user_role_assignments_user_id_is_active_idx`(`user_id`, `is_active`),
    INDEX `user_role_assignments_role_id_idx`(`role_id`),
    UNIQUE INDEX `user_role_assignments_user_id_role_id_directory_id_key`(`user_id`, `role_id`, `directory_id`),
    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letters` (
    `letter_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tracking_number` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `letter_content` LONGTEXT NULL,
    `source_type` ENUM('generated', 'uploaded', 'scanned') NOT NULL DEFAULT 'generated',
    `letter_type` ENUM('internal_inbox', 'internal_outbox', 'outside_inbox', 'outside_outbox') NOT NULL,
    `letter_condition` ENUM('initial', 'response') NOT NULL DEFAULT 'initial',
    `template_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `received_by` INTEGER NOT NULL,
    `owning_directory_id` INTEGER NOT NULL,
    `received_directory_id` INTEGER NOT NULL,
    `stamp_id` INTEGER NULL,
    `signature_id` INTEGER NOT NULL,
    `status` ENUM('send', 'received', 'responded', 'closed', 'archived') NOT NULL DEFAULT 'send',
    `letter_date` DATE NULL,
    `response_due_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `archived_at` DATETIME(0) NULL,

    UNIQUE INDEX `letters_tracking_number_key`(`tracking_number`),
    INDEX `letters_owning_directory_id_status_idx`(`owning_directory_id`, `status`),
    INDEX `letters_received_directory_id_status_idx`(`received_directory_id`, `status`),
    INDEX `letters_received_by_status_idx`(`received_by`, `status`),
    INDEX `letters_created_by_idx`(`created_by`),
    INDEX `letters_letter_type_status_idx`(`letter_type`, `status`),
    INDEX `letters_letter_condition_idx`(`letter_condition`),
    INDEX `letters_status_response_due_at_idx`(`status`, `response_due_at`),
    INDEX `letters_letter_date_idx`(`letter_date`),
    INDEX `letters_created_at_idx`(`created_at`),
    INDEX `letters_template_id_idx`(`template_id`),
    INDEX `letters_stamp_id_idx`(`stamp_id`),
    INDEX `letters_signature_id_idx`(`signature_id`),
    PRIMARY KEY (`letter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_files` (
    `file_id` INTEGER NOT NULL AUTO_INCREMENT,
    `letter_id` INTEGER NOT NULL,
    `uploaded_by` INTEGER NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NULL,
    `file_size_bytes` BIGINT NULL,
    `file_role` ENUM('original', 'attachment', 'scan', 'generated_pdf', 'response') NOT NULL,
    `capture_method` ENUM('upload', 'scanner', 'camera', 'generated') NOT NULL DEFAULT 'upload',
    `page_number` INTEGER NULL,
    `checksum_sha256` VARCHAR(64) NULL,
    `uploaded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `letter_files_letter_id_file_role_page_number_idx`(`letter_id`, `file_role`, `page_number`),
    INDEX `letter_files_uploaded_by_idx`(`uploaded_by`),
    PRIMARY KEY (`file_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_responses` (
    `response_id` INTEGER NOT NULL AUTO_INCREMENT,
    `letter_id` INTEGER NOT NULL,
    `response_letter_id` INTEGER NOT NULL,
    `responded_by` INTEGER NOT NULL,
    `responding_directory_id` INTEGER NOT NULL,
    `response_status` ENUM('send', 'seen', 'closed', 'archived') NOT NULL DEFAULT 'send',
    `responded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `letter_responses_letter_id_response_status_idx`(`letter_id`, `response_status`),
    INDEX `letter_responses_response_letter_id_idx`(`response_letter_id`),
    INDEX `letter_responses_responded_by_idx`(`responded_by`),
    INDEX `letter_responses_responding_directory_id_idx`(`responding_directory_id`),
    PRIMARY KEY (`response_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_templates` (
    `template_id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `template_storage_key` VARCHAR(500) NULL,
    `directory_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `letter_templates_directory_id_is_active_idx`(`directory_id`, `is_active`),
    INDEX `letter_templates_created_by_idx`(`created_by`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `digital_signatures` (
    `signature_id` INTEGER NOT NULL AUTO_INCREMENT,
    `signed_by` INTEGER NOT NULL,
    `signature_type` VARCHAR(50) NOT NULL,
    `signature_reference` VARCHAR(500) NULL,
    `signature_image_url` VARCHAR(500) NULL,
    `signed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `digital_signatures_signed_by_is_active_idx`(`signed_by`, `is_active`),
    PRIMARY KEY (`signature_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stamps` (
    `stamp_id` INTEGER NOT NULL AUTO_INCREMENT,
    `stamp_name` VARCHAR(150) NOT NULL,
    `stamp_image_url` VARCHAR(500) NOT NULL,
    `directory_id` INTEGER NULL,
    `uploaded_by` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `stamps_directory_id_is_active_idx`(`directory_id`, `is_active`),
    INDEX `stamps_uploaded_by_idx`(`uploaded_by`),
    PRIMARY KEY (`stamp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `conversation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_type` ENUM('direct', 'group', 'letter') NOT NULL DEFAULT 'direct',
    `letter_id` INTEGER NULL,
    `conversation_name` VARCHAR(255) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `conversations_letter_id_idx`(`letter_id`),
    INDEX `conversations_created_by_idx`(`created_by`),
    PRIMARY KEY (`conversation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_members` (
    `conversation_member_id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `joined_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `left_at` DATETIME(0) NULL,

    INDEX `conversation_members_user_id_left_at_idx`(`user_id`, `left_at`),
    UNIQUE INDEX `conversation_members_conversation_id_user_id_key`(`conversation_id`, `user_id`),
    PRIMARY KEY (`conversation_member_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `message_id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `message_text` TEXT NOT NULL,
    `sent_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `edited_at` DATETIME(0) NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `messages_conversation_id_sent_at_idx`(`conversation_id`, `sent_at`),
    INDEX `messages_sender_id_idx`(`sender_id`),
    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_attachments` (
    `attachment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` INTEGER NOT NULL,
    `uploaded_by` INTEGER NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NULL,
    `file_size_bytes` BIGINT NULL,
    `uploaded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `message_attachments_message_id_idx`(`message_id`),
    INDEX `message_attachments_uploaded_by_idx`(`uploaded_by`),
    PRIMARY KEY (`attachment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `notification_type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `related_letter_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `read_at` DATETIME(0) NULL,

    INDEX `notifications_user_id_is_read_created_at_idx`(`user_id`, `is_read`, `created_at`),
    INDEX `notifications_related_letter_id_idx`(`related_letter_id`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `audit_log_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(100) NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`audit_log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `announcement_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `published_at` DATETIME(0) NULL,
    `expires_at` DATETIME(0) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `announcements_status_published_at_idx`(`status`, `published_at`),
    INDEX `announcements_created_by_idx`(`created_by`),
    PRIMARY KEY (`announcement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faqs` (
    `faq_id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `created_by` INTEGER NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,

    INDEX `faqs_is_published_category_idx`(`is_published`, `category`),
    PRIMARY KEY (`faq_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_inquiries` (
    `inquiry_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sender_name` VARCHAR(200) NOT NULL,
    `sender_email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `inquiry_status` ENUM('new', 'assigned', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'new',
    `assigned_to` INTEGER NULL,
    `submitted_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolved_at` DATETIME(0) NULL,

    INDEX `contact_inquiries_inquiry_status_submitted_at_idx`(`inquiry_status`, `submitted_at`),
    INDEX `contact_inquiries_assigned_to_idx`(`assigned_to`),
    PRIMARY KEY (`inquiry_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `directories` ADD CONSTRAINT `directories_parent_directory_id_fkey` FOREIGN KEY (`parent_directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_directory_id_fkey` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_received_by_fkey` FOREIGN KEY (`received_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_owning_directory_id_fkey` FOREIGN KEY (`owning_directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_received_directory_id_fkey` FOREIGN KEY (`received_directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_stamp_id_fkey` FOREIGN KEY (`stamp_id`) REFERENCES `stamps`(`stamp_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_signature_id_fkey` FOREIGN KEY (`signature_id`) REFERENCES `digital_signatures`(`signature_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letters` ADD CONSTRAINT `letters_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `letter_templates`(`template_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_files` ADD CONSTRAINT `letter_files_letter_id_fkey` FOREIGN KEY (`letter_id`) REFERENCES `letters`(`letter_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_files` ADD CONSTRAINT `letter_files_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_responses` ADD CONSTRAINT `letter_responses_letter_id_fkey` FOREIGN KEY (`letter_id`) REFERENCES `letters`(`letter_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_responses` ADD CONSTRAINT `letter_responses_response_letter_id_fkey` FOREIGN KEY (`response_letter_id`) REFERENCES `letters`(`letter_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_responses` ADD CONSTRAINT `letter_responses_responded_by_fkey` FOREIGN KEY (`responded_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_responses` ADD CONSTRAINT `letter_responses_responding_directory_id_fkey` FOREIGN KEY (`responding_directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_templates` ADD CONSTRAINT `letter_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_templates` ADD CONSTRAINT `letter_templates_directory_id_fkey` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_signatures` ADD CONSTRAINT `digital_signatures_signed_by_fkey` FOREIGN KEY (`signed_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamps` ADD CONSTRAINT `stamps_directory_id_fkey` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`directory_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stamps` ADD CONSTRAINT `stamps_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_letter_id_fkey` FOREIGN KEY (`letter_id`) REFERENCES `letters`(`letter_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`conversation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`conversation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`message_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_related_letter_id_fkey` FOREIGN KEY (`related_letter_id`) REFERENCES `letters`(`letter_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faqs` ADD CONSTRAINT `faqs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_inquiries` ADD CONSTRAINT `contact_inquiries_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
