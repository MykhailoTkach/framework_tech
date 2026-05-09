CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`author` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`genre` varchar(255) DEFAULT '',
	`image` varchar(255),
	`pagecount` int DEFAULT 0,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
