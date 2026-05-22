CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ort` text NOT NULL,
	`typ` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`adresse` text NOT NULL,
	`tel` text NOT NULL,
	`fax` text,
	`mail` text NOT NULL,
	`web` text,
	`leitung` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `schools_typ_idx` ON `schools` (`typ`);--> statement-breakpoint
CREATE INDEX `schools_ort_idx` ON `schools` (`ort`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `training_needs` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`created_by` text,
	`topic` text NOT NULL,
	`description` text NOT NULL,
	`priority` text NOT NULL,
	`target_group` text NOT NULL,
	`preferred_format` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_needs_school_id_idx` ON `training_needs` (`school_id`);--> statement-breakpoint
CREATE INDEX `training_needs_status_idx` ON `training_needs` (`status`);--> statement-breakpoint
CREATE INDEX `training_needs_priority_idx` ON `training_needs` (`priority`);--> statement-breakpoint
CREATE TABLE `training_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`training_need_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`date` text,
	`location` text,
	`max_participants` integer,
	`format` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`training_need_id`) REFERENCES `training_needs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `training_offers_training_need_id_idx` ON `training_offers` (`training_need_id`);--> statement-breakpoint
CREATE INDEX `training_offers_status_idx` ON `training_offers` (`status`);--> statement-breakpoint
CREATE INDEX `training_offers_date_idx` ON `training_offers` (`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`school_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_school_id_idx` ON `users` (`school_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);