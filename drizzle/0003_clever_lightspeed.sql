ALTER TABLE "training_plans" DROP CONSTRAINT "training_plans_person_id_persons_id_fk";
--> statement-breakpoint
DROP INDEX "uq_plan_person_weekday";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_plan_weekday" ON "training_plans" USING btree ("weekday");--> statement-breakpoint
ALTER TABLE "training_plans" DROP COLUMN "person_id";