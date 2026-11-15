CREATE TABLE `estimate_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`estimate_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity_hundredths` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "estimate_items_quantity_not_negative" CHECK("estimate_items"."quantity_hundredths" >= 0),
	CONSTRAINT "estimate_items_price_not_negative" CHECK("estimate_items"."unit_price_minor" >= 0)
);
--> statement-breakpoint
CREATE INDEX `estimate_items_estimate_id` ON `estimate_items` (`estimate_id`);--> statement-breakpoint
CREATE TABLE `estimates` (
	`id` integer PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` integer NOT NULL,
	`recipient` text NOT NULL,
	`issue_date` text NOT NULL,
	`valid_until` text,
	`subject` text,
	`notes` text,
	`tax_basis_points` integer NOT NULL,
	`discount_basis_points` integer NOT NULL,
	`sent_on` text,
	`accepted_on` text,
	`declined_on` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "estimates_tax_range" CHECK("estimates"."tax_basis_points" BETWEEN 0 AND 10000),
	CONSTRAINT "estimates_discount_range" CHECK("estimates"."discount_basis_points" BETWEEN 0 AND 10000),
	CONSTRAINT "estimates_valid_after_issue" CHECK("estimates"."valid_until" IS NULL OR "estimates"."valid_until" >= "estimates"."issue_date"),
	CONSTRAINT "estimates_not_accepted_and_declined" CHECK(NOT ("estimates"."accepted_on" IS NOT NULL AND "estimates"."declined_on" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `estimates_number_unique` ON `estimates` (lower("number"));--> statement-breakpoint
CREATE INDEX `estimates_customer_id` ON `estimates` (`customer_id`);--> statement-breakpoint
ALTER TABLE `settings` ADD `default_estimate_notes` text;