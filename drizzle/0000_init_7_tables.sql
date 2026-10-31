CREATE TABLE "food_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"date" date NOT NULL,
	"meal_type" text NOT NULL,
	"name" text NOT NULL,
	"calories" integer NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"daily_calorie_target" integer DEFAULT 2000 NOT NULL,
	"notify_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protein_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"date" date NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"date" date NOT NULL,
	"plan_weekday" integer,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"weekday" integer NOT NULL,
	"content" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protein_checkins" ADD CONSTRAINT "protein_checkins_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_logs" ADD CONSTRAINT "training_logs_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weights" ADD CONSTRAINT "weights_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_protein_person_date" ON "protein_checkins" USING btree ("person_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_push_endpoint" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_plan_person_weekday" ON "training_plans" USING btree ("person_id","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_weight_person_date" ON "weights" USING btree ("person_id","date");