CREATE TABLE `sahati_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`hospital_id` text NOT NULL,
	`patient_id` text,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sahati_accounts_email_unique` ON `sahati_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `sahati_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sahati_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sahati_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sahati_hospitals` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sahati_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`hospital_id` text NOT NULL,
	`patient_id` text,
	`data` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("sahati_records"."quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX `record_kind_hospital` ON `sahati_records` (`kind`,`hospital_id`);--> statement-breakpoint
CREATE INDEX `record_patient` ON `sahati_records` (`patient_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_admission` ON `sahati_records` (`patient_id`) WHERE "sahati_records"."kind"='admissions' AND json_extract("sahati_records"."data", '$.status')='admitted';--> statement-breakpoint
CREATE TABLE `sahati_schedule_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`resource` text NOT NULL,
	`slot` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_resource_slot` ON `sahati_schedule_slots` (`resource`,`slot`);--> statement-breakpoint
CREATE INDEX `schedule_record` ON `sahati_schedule_slots` (`record_id`);--> statement-breakpoint
CREATE TABLE `sahati_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`phase` text NOT NULL,
	`account_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
