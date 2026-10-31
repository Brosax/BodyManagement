ALTER TABLE "persons" ADD COLUMN "protein_serving_g" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "protein_kcal_per_100g" integer DEFAULT 400 NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "protein_protein_per_100g" integer DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE "protein_checkins" ADD COLUMN "food_entry_id" integer;--> statement-breakpoint
ALTER TABLE "protein_checkins" ADD COLUMN "serving_g" real;--> statement-breakpoint
ALTER TABLE "protein_checkins" ADD CONSTRAINT "protein_checkins_food_entry_id_food_entries_id_fk" FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entries"("id") ON DELETE no action ON UPDATE no action;