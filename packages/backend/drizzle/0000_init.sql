CREATE TABLE `customers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hourly_rate_minor` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	CONSTRAINT "customers_rate_not_negative" CHECK("customers"."hourly_rate_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_name_unique` ON `customers` (lower("name"));--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`description` text NOT NULL,
	`billable` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "expenses_amount_positive" CHECK("expenses"."amount_minor" > 0),
	CONSTRAINT "expenses_description_not_blank" CHECK(length(trim("expenses"."description")) > 0)
);
--> statement-breakpoint
CREATE INDEX `expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `expenses_project_id` ON `expenses` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY NOT NULL,
	`customer_id` integer NOT NULL,
	`name` text NOT NULL,
	`hourly_rate_minor` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "projects_rate_not_negative" CHECK("projects"."hourly_rate_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_customer_name_unique` ON `projects` (`customer_id`,lower("name"));--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`default_hourly_rate_minor` integer NOT NULL,
	`rounding_minutes` integer NOT NULL,
	`language` text NOT NULL,
	`timezone` text NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_rate_not_negative" CHECK("settings"."default_hourly_rate_minor" >= 0),
	CONSTRAINT "settings_rounding" CHECK("settings"."rounding_minutes" IN (0, 5, 6, 10, 15, 30, 60)),
	CONSTRAINT "settings_language" CHECK("settings"."language" IN ('de', 'en'))
);
--> statement-breakpoint
CREATE TABLE `time_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_id` integer NOT NULL,
	`date` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`running_since` integer,
	`description` text,
	`hourly_rate_minor` integer NOT NULL,
	`hourly_rate_overridden` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "time_entries_duration_not_negative" CHECK("time_entries"."duration_seconds" >= 0),
	CONSTRAINT "time_entries_rate_not_negative" CHECK("time_entries"."hourly_rate_minor" >= 0)
);
--> statement-breakpoint
CREATE INDEX `time_entries_date` ON `time_entries` (`date`);--> statement-breakpoint
CREATE INDEX `time_entries_project_id` ON `time_entries` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `time_entries_single_running` ON `time_entries` ((1)) WHERE running_since IS NOT NULL;