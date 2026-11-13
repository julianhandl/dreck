CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity_hundredths` integer NOT NULL,
	`unit_price_minor` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "invoice_items_quantity_not_negative" CHECK("invoice_items"."quantity_hundredths" >= 0),
	CONSTRAINT "invoice_items_price_not_negative" CHECK("invoice_items"."unit_price_minor" >= 0)
);
--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_id` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`customer_id` integer NOT NULL,
	`recipient` text NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`period_from` text,
	`period_to` text,
	`subject` text,
	`notes` text,
	`tax_basis_points` integer NOT NULL,
	`discount_basis_points` integer NOT NULL,
	`sent_on` text,
	`paid_on` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "invoices_tax_range" CHECK("invoices"."tax_basis_points" BETWEEN 0 AND 10000),
	CONSTRAINT "invoices_discount_range" CHECK("invoices"."discount_basis_points" BETWEEN 0 AND 10000),
	CONSTRAINT "invoices_due_after_issue" CHECK("invoices"."due_date" >= "invoices"."issue_date")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (lower("number"));--> statement-breakpoint
CREATE INDEX `invoices_customer_id` ON `invoices` (`customer_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `address` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `invoice_item_id` integer REFERENCES invoice_items(id) ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `expenses_invoice_item_id` ON `expenses` (`invoice_item_id`);--> statement-breakpoint
ALTER TABLE `settings` ADD `sender_name` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `sender_address` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `sender_vat_id` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `default_tax_basis_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `default_invoice_notes` text;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `invoice_item_id` integer REFERENCES invoice_items(id) ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `time_entries_invoice_item_id` ON `time_entries` (`invoice_item_id`);