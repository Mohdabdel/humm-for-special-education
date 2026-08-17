ALTER TABLE "team_member" ADD COLUMN "user_id" uuid;
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
