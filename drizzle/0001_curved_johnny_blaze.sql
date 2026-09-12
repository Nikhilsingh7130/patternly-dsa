CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`leetcodeNumber` int,
	`section` varchar(128) NOT NULL,
	`pattern` varchar(255) NOT NULL,
	`difficulty` enum('Easy','Medium','Hard') NOT NULL DEFAULT 'Medium',
	`status` enum('Not started','In progress','Solved') NOT NULL DEFAULT 'Not started',
	`url` varchar(512),
	`notes` text,
	`source` varchar(128) NOT NULL DEFAULT 'Manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
