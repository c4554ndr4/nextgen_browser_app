CREATE TABLE `quotas` (
	`key` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL,
	`cap` integer NOT NULL,
	`expires` integer NOT NULL,
	CONSTRAINT "quota_cap" CHECK("quotas"."used" <= "quotas"."cap")
);
