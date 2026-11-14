CREATE TABLE `default_tasks` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`billable` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `default_tasks_name_unique` ON `default_tasks` (lower("name"));--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`billable` integer NOT NULL,
	`hourly_rate_minor` integer,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_rate_not_negative" CHECK("tasks"."hourly_rate_minor" >= 0),
	CONSTRAINT "tasks_rate_only_billable" CHECK("tasks"."billable" = 1 OR "tasks"."hourly_rate_minor" IS NULL)
);
--> statement-breakpoint
CREATE INDEX `tasks_project_id` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_project_name_unique` ON `tasks` (`project_id`,lower("name"));--> statement-breakpoint
ALTER TABLE `time_entries` ADD `task_id` integer REFERENCES tasks(id) ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `time_entries_task_id` ON `time_entries` (`task_id`);