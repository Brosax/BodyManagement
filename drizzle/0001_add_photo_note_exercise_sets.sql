CREATE TABLE "exercise_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"date" date NOT NULL,
	"exercise_name" text NOT NULL,
	"set_index" integer NOT NULL,
	"reps" integer NOT NULL,
	"weight_kg" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_entries" ADD COLUMN "photo" "bytea";--> statement-breakpoint
ALTER TABLE "food_entries" ADD COLUMN "ai_note" text;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_sets_person_date" ON "exercise_sets" USING btree ("person_id","date");--> statement-breakpoint
CREATE INDEX "ix_sets_person_exercise" ON "exercise_sets" USING btree ("person_id","exercise_name");