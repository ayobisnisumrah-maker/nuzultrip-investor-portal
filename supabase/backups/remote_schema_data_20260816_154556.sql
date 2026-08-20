


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'ir'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module" character varying(100),
    "action" character varying(100),
    "user_name" character varying(200),
    "description" "text",
    "ip_address" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200),
    "email" character varying(200),
    "phone" character varying(50),
    "subject" character varying(255),
    "message" "text",
    "status" character varying(30) DEFAULT 'new'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."contact_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_room_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid",
    "token_id" "uuid",
    "document_id" "uuid",
    "action" character varying(50) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_room_access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_access_logs" IS 'Protected investor Data Room access audit log. Access exclusively through server Edge Functions.';



CREATE TABLE IF NOT EXISTS "public"."data_room_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(200),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_room_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_categories" IS 'Protected investor Data Room categories. Access exclusively through server Edge Functions.';



CREATE TABLE IF NOT EXISTS "public"."data_room_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "title" character varying(255),
    "description" "text",
    "file_name" character varying(255),
    "file_url" "text",
    "file_size" bigint,
    "mime_type" character varying(100),
    "visibility" character varying(30) DEFAULT 'private'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content" "jsonb" DEFAULT '{"sections": []}'::"jsonb" NOT NULL,
    "pages" integer DEFAULT 0 NOT NULL,
    "cover_image_url" "text",
    "embed_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_room_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_documents" IS 'Protected investor Data Room documents. Access exclusively through server Edge Functions and investor-token verification.';



COMMENT ON COLUMN "public"."data_room_documents"."content" IS 'Structured Data Room document content rendered by Admin and Investor Portal.';



COMMENT ON COLUMN "public"."data_room_documents"."cover_image_url" IS 'Optional document cover image.';



COMMENT ON COLUMN "public"."data_room_documents"."embed_url" IS 'Optional external embed reference. Must never bypass investor authorization for protected files.';



CREATE TABLE IF NOT EXISTS "public"."investor_requests" (
    "id" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "country" "text" NOT NULL,
    "amount" "text" NOT NULL,
    "nda_signed" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text",
    "token_expires_at" timestamp with time zone,
    "access_link" "text",
    "approved_at" timestamp with time zone,
    "approved_by" "text",
    "approval_note" "text",
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "investor_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."investor_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."investor_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "reason" "text",
    "note" "text",
    "actor_id" "text",
    "actor_type" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."investor_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "token" character varying(100) NOT NULL,
    "period" character varying(20),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "investor_name" "text",
    "investor_email" "text"
);


ALTER TABLE "public"."investor_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "email" character varying(200) NOT NULL,
    "phone" character varying(50),
    "company" character varying(200),
    "city" character varying(100),
    "country" character varying(100),
    "investment_interest" "text",
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone,
    "verified_by" "text",
    "rejection_reason" "text"
);

ALTER TABLE ONLY "public"."investors" REPLICA IDENTITY FULL;


ALTER TABLE "public"."investors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_b620c355" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_b620c355" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_bookings" (
    "id" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "type" "text" NOT NULL,
    "date_label" "text" NOT NULL,
    "time_label" "text" NOT NULL,
    "confirmation_code" "text" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "meeting_bookings_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'done'::"text", 'cancelled'::"text"])))
);

ALTER TABLE ONLY "public"."meeting_bookings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."meeting_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid",
    "meeting_date" timestamp with time zone,
    "meeting_type" character varying(50),
    "location" character varying(255),
    "meeting_link" "text",
    "status" character varying(50),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page" character varying(100) NOT NULL,
    "section" character varying(100) NOT NULL,
    "title" character varying(255),
    "slug" character varying(255),
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" character varying(30) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."portal_content" REPLICA IDENTITY FULL;


ALTER TABLE "public"."portal_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" character varying(150) NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "public"."app_role" DEFAULT 'ir'::"public"."app_role" NOT NULL,
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_categories"
    ADD CONSTRAINT "data_room_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_documents"
    ADD CONSTRAINT "data_room_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_requests"
    ADD CONSTRAINT "investor_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_status_history"
    ADD CONSTRAINT "investor_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_b620c355"
    ADD CONSTRAINT "kv_store_b620c355_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."meeting_bookings"
    ADD CONSTRAINT "meeting_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_content"
    ADD CONSTRAINT "portal_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_content"
    ADD CONSTRAINT "portal_unique" UNIQUE ("page", "section");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "idx_data_room_access_logs_created" ON "public"."data_room_access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_data_room_access_logs_document" ON "public"."data_room_access_logs" USING "btree" ("document_id");



CREATE INDEX "idx_data_room_access_logs_investor" ON "public"."data_room_access_logs" USING "btree" ("investor_id");



CREATE INDEX "idx_data_room_access_logs_token" ON "public"."data_room_access_logs" USING "btree" ("token_id");



CREATE INDEX "idx_data_room_documents_active_visibility" ON "public"."data_room_documents" USING "btree" ("is_active", "visibility");



CREATE INDEX "idx_data_room_documents_sort_order" ON "public"."data_room_documents" USING "btree" ("sort_order");



CREATE INDEX "idx_portal_page" ON "public"."portal_content" USING "btree" ("page");



CREATE INDEX "idx_portal_section" ON "public"."portal_content" USING "btree" ("section");



CREATE INDEX "investor_status_history_created_idx" ON "public"."investor_status_history" USING "btree" ("created_at" DESC);



CREATE INDEX "investor_status_history_investor_idx" ON "public"."investor_status_history" USING "btree" ("investor_id");



CREATE INDEX "investor_tokens_expires_at_idx" ON "public"."investor_tokens" USING "btree" ("expires_at");



CREATE INDEX "investor_tokens_investor_id_idx" ON "public"."investor_tokens" USING "btree" ("investor_id");



CREATE INDEX "investor_tokens_period_idx" ON "public"."investor_tokens" USING "btree" ("period");



CREATE INDEX "investor_tokens_token_idx" ON "public"."investor_tokens" USING "btree" ("token");



CREATE INDEX "investors_status_idx" ON "public"."investors" USING "btree" ("status");



CREATE INDEX "investors_verified_at_idx" ON "public"."investors" USING "btree" ("verified_at");



CREATE INDEX "kv_store_b620c355_key_idx" ON "public"."kv_store_b620c355" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_b620c355_key_idx1" ON "public"."kv_store_b620c355" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_b620c355_key_idx2" ON "public"."kv_store_b620c355" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_b620c355_key_idx3" ON "public"."kv_store_b620c355" USING "btree" ("key" "text_pattern_ops");



CREATE UNIQUE INDEX "portal_content_slug_unique" ON "public"."portal_content" USING "btree" ("slug");



CREATE INDEX "user_profiles_role_idx" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "user_profiles_status_idx" ON "public"."user_profiles" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "contact_messages_updated_at" BEFORE UPDATE ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "investor_requests_updated_at" BEFORE UPDATE ON "public"."investor_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "meeting_bookings_updated_at" BEFORE UPDATE ON "public"."meeting_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."data_room_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."investor_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_documents"
    ADD CONSTRAINT "data_room_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."data_room_categories"("id");



ALTER TABLE ONLY "public"."investor_status_history"
    ADD CONSTRAINT "investor_status_history_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."data_room_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_room_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_room_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investor_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_b620c355" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_content_public_read" ON "public"."portal_content" FOR SELECT TO "authenticated", "anon" USING ((("status")::"text" = 'published'::"text"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."contact_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."investor_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."investors";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."meeting_bookings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."portal_content";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_categories" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_documents" TO "service_role";



GRANT ALL ON TABLE "public"."investor_requests" TO "anon";
GRANT ALL ON TABLE "public"."investor_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_requests" TO "service_role";



GRANT ALL ON TABLE "public"."investor_status_history" TO "anon";
GRANT ALL ON TABLE "public"."investor_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."investor_tokens" TO "anon";
GRANT ALL ON TABLE "public"."investor_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."investors" TO "anon";
GRANT ALL ON TABLE "public"."investors" TO "authenticated";
GRANT ALL ON TABLE "public"."investors" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_bookings" TO "anon";
GRANT ALL ON TABLE "public"."meeting_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."portal_content" TO "anon";
GRANT ALL ON TABLE "public"."portal_content" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_content" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































