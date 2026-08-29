/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  pnpm db:types
 * Source of truth:  supabase/migrations/**
 *
 * See docs/DATABASE.md §13.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  app: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_role_key: { Args: never; Returns: string }
      assert_role_assignable: {
        Args: { p_role_id: string }
        Returns: undefined
      }
      create_document_with_draft: {
        Args: {
          p_file_asset_id?: string
          p_kind: Database["public"]["Enums"]["document_kind"]
          p_slug: string
          p_summary?: string
          p_title: string
          p_visibility?: Database["public"]["Enums"]["visibility"]
        }
        Returns: {
          document_id: string
          file_asset_id: string
          kind: Database["public"]["Enums"]["document_kind"]
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          summary: string
          title: string
          version_id: string
          version_number: number
          visibility: Database["public"]["Enums"]["visibility"]
        }[]
      }
      create_investor_message_thread: {
        Args: { p_body: string; p_investor_id: string; p_subject: string }
        Returns: string
      }
      current_actor_type: { Args: never; Returns: string }
      current_investor_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      document_workflow_permission_allowed: {
        Args: { p_target: Database["public"]["Enums"]["publication_status"] }
        Returns: boolean
      }
      effective_permissions: { Args: { p_admin_id: string }; Returns: string[] }
      emit_event: {
        Args: {
          p_actor_type?: string
          p_entity_id: string
          p_entity_type: string
          p_kind: string
          p_topic: string
        }
        Returns: undefined
      }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      investor_granted_document: {
        Args: { p_document_id: string }
        Returns: boolean
      }
      investor_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["investor_status"]
          p_to: Database["public"]["Enums"]["investor_status"]
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_investor: { Args: never; Returns: boolean }
      participates_in_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      publication_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["publication_status"]
          p_to: Database["public"]["Enums"]["publication_status"]
        }
        Returns: boolean
      }
      published_change_is_referential: {
        Args: { p_new: Json; p_old: Json }
        Returns: boolean
      }
      topic_admin: { Args: never; Returns: string }
      topic_all_investors: { Args: never; Returns: string }
      topic_investor: { Args: { p_investor_id: string }; Returns: string }
      topic_portal: { Args: never; Returns: string }
      topic_user: { Args: { p_user_id: string }; Returns: string }
      transition_portal_page: {
        Args: {
          p_page_id: string
          p_to_status: Database["public"]["Enums"]["publication_status"]
        }
        Returns: {
          page_id: string
          page_title: string
          previous_status: Database["public"]["Enums"]["publication_status"]
          status: Database["public"]["Enums"]["publication_status"]
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          created_by: string | null
          disabled_at: string | null
          disabled_reason: string | null
          employee_ref: string | null
          id: string
          is_active: boolean
          role_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          employee_ref?: string | null
          id: string
          is_active?: boolean
          role_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          employee_ref?: string | null
          id?: string
          is_active?: boolean
          role_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admins_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admins_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          actor_type: string
          changes: Json
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_hash: string | null
          summary: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          actor_type?: string
          changes?: Json
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_hash?: string | null
          summary?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          actor_type?: string
          changes?: Json
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_hash?: string | null
          summary?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience: Database["public"]["Enums"]["broadcast_audience"]
          audience_filter: Json
          body_rich: Json
          created_at: string
          created_by: string | null
          id: string
          recipient_count: number
          sent_at: string | null
          subject: string
        }
        Insert: {
          audience: Database["public"]["Enums"]["broadcast_audience"]
          audience_filter?: Json
          body_rich?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          sent_at?: string | null
          subject: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["broadcast_audience"]
          audience_filter?: Json
          body_rich?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile_versions: {
        Row: {
          achievements: Json
          approved_at: string | null
          approved_by: string | null
          brand_assets: Json
          business_ecosystem: Json
          business_overview: Json
          change_note: string | null
          company_profile_id: string
          contact: Json
          created_at: string
          created_by: string | null
          history: Json
          id: string
          identity: Json
          leadership: Json
          legal_information: Json
          milestones: Json
          mission: Json
          published_at: string | null
          statistics: Json
          status: Database["public"]["Enums"]["publication_status"]
          strategic_direction: Json
          version_number: number
          vision: Json
        }
        Insert: {
          achievements?: Json
          approved_at?: string | null
          approved_by?: string | null
          brand_assets?: Json
          business_ecosystem?: Json
          business_overview?: Json
          change_note?: string | null
          company_profile_id: string
          contact?: Json
          created_at?: string
          created_by?: string | null
          history?: Json
          id?: string
          identity?: Json
          leadership?: Json
          legal_information?: Json
          milestones?: Json
          mission?: Json
          published_at?: string | null
          statistics?: Json
          status?: Database["public"]["Enums"]["publication_status"]
          strategic_direction?: Json
          version_number: number
          vision?: Json
        }
        Update: {
          achievements?: Json
          approved_at?: string | null
          approved_by?: string | null
          brand_assets?: Json
          business_ecosystem?: Json
          business_overview?: Json
          change_note?: string | null
          company_profile_id?: string
          contact?: Json
          created_at?: string
          created_by?: string | null
          history?: Json
          id?: string
          identity?: Json
          leadership?: Json
          legal_information?: Json
          milestones?: Json
          mission?: Json
          published_at?: string | null
          statistics?: Json
          status?: Database["public"]["Enums"]["publication_status"]
          strategic_direction?: Json
          version_number?: number
          vision?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_profile_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profile_versions_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profile_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          created_at: string
          current_version_id: string | null
          display_name: string
          id: string
          legal_name: string
          published_version_id: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          display_name: string
          id?: string
          legal_name: string
          published_version_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          display_name?: string
          id?: string
          legal_name?: string
          published_version_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "company_profile_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "company_profile_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          message: string | null
          phone: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          phone?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      data_room_access_logs: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          id: string
          investor_id: string | null
          ip_address: unknown
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          id?: string
          investor_id?: string | null
          ip_address?: unknown
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          id?: string
          investor_id?: string | null
          ip_address?: unknown
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_access_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "data_room_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_access_logs_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "legacy_investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_access_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "investor_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      data_room_documents: {
        Row: {
          category_id: string | null
          content: Json
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          embed_url: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          pages: number
          sort_order: number
          title: string | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          category_id?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          embed_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          pages?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          category_id?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          embed_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          pages?: number
          sort_order?: number
          title?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "data_room_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_grants: {
        Row: {
          document_id: string
          granted_at: string
          granted_by: string | null
          id: string
          investor_id: string
          note: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          document_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          investor_id: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          document_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          investor_id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_grants_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_grants_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_note: string | null
          content: Json
          created_at: string
          created_by: string | null
          document_id: string
          file_asset_id: string | null
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          document_id: string
          file_asset_id?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          document_id?: string
          file_asset_id?: string | null
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_file_asset_id_fkey"
            columns: ["file_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          current_version_id: string | null
          id: string
          kind: Database["public"]["Enums"]["document_kind"]
          owner_admin_id: string | null
          published_version_id: string | null
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["document_kind"]
          owner_admin_id?: string | null
          published_version_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["document_kind"]
          owner_admin_id?: string | null
          published_version_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_admin_id_fkey"
            columns: ["owner_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_kpis: {
        Row: {
          basis: string
          financial_report_version_id: string
          id: string
          kpi_key: string
          label: string
          position: number
          unit: string
          value: number
        }
        Insert: {
          basis?: string
          financial_report_version_id: string
          id?: string
          kpi_key: string
          label: string
          position?: number
          unit?: string
          value: number
        }
        Update: {
          basis?: string
          financial_report_version_id?: string
          id?: string
          kpi_key?: string
          label?: string
          position?: number
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_kpis_financial_report_version_id_fkey"
            columns: ["financial_report_version_id"]
            isOneToOne: false
            referencedRelation: "financial_report_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_line_items: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["financial_category"]
          created_at: string
          currency: string
          financial_report_version_id: string
          id: string
          label: string
          line_key: string
          note: string | null
          parent_id: string | null
          position: number
          statement: Database["public"]["Enums"]["financial_statement"]
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["financial_category"]
          created_at?: string
          currency?: string
          financial_report_version_id: string
          id?: string
          label: string
          line_key: string
          note?: string | null
          parent_id?: string | null
          position?: number
          statement: Database["public"]["Enums"]["financial_statement"]
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["financial_category"]
          created_at?: string
          currency?: string
          financial_report_version_id?: string
          id?: string
          label?: string
          line_key?: string
          note?: string | null
          parent_id?: string | null
          position?: number
          statement?: Database["public"]["Enums"]["financial_statement"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_line_items_financial_report_version_id_fkey"
            columns: ["financial_report_version_id"]
            isOneToOne: false
            referencedRelation: "financial_report_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_line_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "financial_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          created_at: string
          currency: string
          ends_on: string
          fiscal_year: number
          id: string
          period_index: number
          period_type: Database["public"]["Enums"]["period_type"]
          starts_on: string
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          ends_on: string
          fiscal_year: number
          id?: string
          period_index: number
          period_type: Database["public"]["Enums"]["period_type"]
          starts_on: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          ends_on?: string
          fiscal_year?: number
          id?: string
          period_index?: number
          period_type?: Database["public"]["Enums"]["period_type"]
          starts_on?: string
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_report_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_note: string | null
          created_at: string
          created_by: string | null
          document_asset_id: string | null
          financial_report_id: string
          id: string
          notes: string | null
          prepared_by: string | null
          published_at: string | null
          source: Database["public"]["Enums"]["financial_source"]
          status: Database["public"]["Enums"]["publication_status"]
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          document_asset_id?: string | null
          financial_report_id: string
          id?: string
          notes?: string | null
          prepared_by?: string | null
          published_at?: string | null
          source: Database["public"]["Enums"]["financial_source"]
          status?: Database["public"]["Enums"]["publication_status"]
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          created_at?: string
          created_by?: string | null
          document_asset_id?: string | null
          financial_report_id?: string
          id?: string
          notes?: string | null
          prepared_by?: string | null
          published_at?: string | null
          source?: Database["public"]["Enums"]["financial_source"]
          status?: Database["public"]["Enums"]["publication_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_report_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_report_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_report_versions_document_asset_id_fkey"
            columns: ["document_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_report_versions_financial_report_id_fkey"
            columns: ["financial_report_id"]
            isOneToOne: false
            referencedRelation: "financial_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          archived_at: string | null
          created_at: string
          current_version_id: string | null
          financial_period_id: string
          id: string
          owner_admin_id: string | null
          published_version_id: string | null
          status: Database["public"]["Enums"]["publication_status"]
          summary: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_version_id?: string | null
          financial_period_id: string
          id?: string
          owner_admin_id?: string | null
          published_version_id?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_version_id?: string | null
          financial_period_id?: string
          id?: string
          owner_admin_id?: string | null
          published_version_id?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          summary?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_reports_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "financial_report_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_financial_period_id_fkey"
            columns: ["financial_period_id"]
            isOneToOne: true
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_owner_admin_id_fkey"
            columns: ["owner_admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reports_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "financial_report_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_requests: {
        Row: {
          access_link: string | null
          amount: string
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          company: string
          country: string
          email: string
          id: string
          name: string
          nda_signed: boolean
          phone: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string
          token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_link?: string | null
          amount: string
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company: string
          country: string
          email: string
          id: string
          name: string
          nda_signed?: boolean
          phone: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_link?: string | null
          amount?: string
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company?: string
          country?: string
          email?: string
          id?: string
          name?: string
          nda_signed?: boolean
          phone?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      investor_status_history: {
        Row: {
          changed_by: string | null
          changed_by_label: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["investor_status"] | null
          id: string
          investor_id: string
          metadata: Json
          reason: string | null
          to_status: Database["public"]["Enums"]["investor_status"]
        }
        Insert: {
          changed_by?: string | null
          changed_by_label?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["investor_status"] | null
          id?: string
          investor_id: string
          metadata?: Json
          reason?: string | null
          to_status: Database["public"]["Enums"]["investor_status"]
        }
        Update: {
          changed_by?: string | null
          changed_by_label?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["investor_status"] | null
          id?: string
          investor_id?: string
          metadata?: Json
          reason?: string | null
          to_status?: Database["public"]["Enums"]["investor_status"]
        }
        Relationships: [
          {
            foreignKeyName: "investor_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_status_history_investor_id_fkey1"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          investor_email: string | null
          investor_id: string
          investor_name: string | null
          is_active: boolean | null
          period: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          investor_email?: string | null
          investor_id: string
          investor_name?: string | null
          is_active?: boolean | null
          period?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          investor_email?: string | null
          investor_id?: string
          investor_name?: string | null
          is_active?: boolean | null
          period?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_tokens_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "legacy_investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          activated_at: string | null
          address: string | null
          application_note: string | null
          applied_at: string | null
          approved_at: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          city: string | null
          country: string
          created_at: string
          deactivated_at: string | null
          id: string
          identity_number_hash: string | null
          investor_type: Database["public"]["Enums"]["investor_type"]
          ktp_file_size_bytes: number | null
          ktp_mime_type: string | null
          ktp_original_file_name: string | null
          ktp_storage_bucket: string | null
          ktp_storage_path: string | null
          ktp_uploaded_at: string | null
          legal_name: string
          organization_name: string | null
          organization_role: string | null
          reference_code: string
          rejection_reason: string | null
          relationship_manager_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["investor_status"]
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          application_note?: string | null
          applied_at?: string | null
          approved_at?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          deactivated_at?: string | null
          id: string
          identity_number_hash?: string | null
          investor_type?: Database["public"]["Enums"]["investor_type"]
          ktp_file_size_bytes?: number | null
          ktp_mime_type?: string | null
          ktp_original_file_name?: string | null
          ktp_storage_bucket?: string | null
          ktp_storage_path?: string | null
          ktp_uploaded_at?: string | null
          legal_name: string
          organization_name?: string | null
          organization_role?: string | null
          reference_code: string
          rejection_reason?: string | null
          relationship_manager_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          application_note?: string | null
          applied_at?: string | null
          approved_at?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          identity_number_hash?: string | null
          investor_type?: Database["public"]["Enums"]["investor_type"]
          ktp_file_size_bytes?: number | null
          ktp_mime_type?: string | null
          ktp_original_file_name?: string | null
          ktp_storage_bucket?: string | null
          ktp_storage_path?: string | null
          ktp_uploaded_at?: string | null
          legal_name?: string
          organization_name?: string | null
          organization_role?: string | null
          reference_code?: string
          rejection_reason?: string | null
          relationship_manager_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["investor_status"]
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_relationship_manager_id_fkey"
            columns: ["relationship_manager_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investors_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_store_b620c355: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      legacy_audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          module: string | null
          user_name: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      legacy_investor_status_history: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          from_status: string | null
          id: string
          investor_id: string
          note: string | null
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          from_status?: string | null
          id?: string
          investor_id: string
          note?: string | null
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          from_status?: string | null
          id?: string
          investor_id?: string
          note?: string | null
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_status_history_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "legacy_investors"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_investors: {
        Row: {
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          investment_interest: string | null
          notes: string | null
          phone: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          investment_interest?: string | null
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          investment_interest?: string | null
          notes?: string | null
          phone?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          bucket: string
          byte_size: number
          caption: string | null
          checksum_sha256: string | null
          created_at: string
          duration_ms: number | null
          finalized_at: string | null
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          path: string
          updated_at: string
          uploaded_by: string | null
          visibility: Database["public"]["Enums"]["asset_visibility"]
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          bucket: string
          byte_size: number
          caption?: string | null
          checksum_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          finalized_at?: string | null
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          path: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["asset_visibility"]
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          byte_size?: number
          caption?: string | null
          checksum_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          finalized_at?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          path?: string
          updated_at?: string
          uploaded_by?: string | null
          visibility?: Database["public"]["Enums"]["asset_visibility"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bookings: {
        Row: {
          company: string
          confirmation_code: string
          date_label: string
          email: string
          id: string
          message: string
          name: string
          phone: string
          status: string
          submitted_at: string
          time_label: string
          type: string
          updated_at: string
        }
        Insert: {
          company: string
          confirmation_code: string
          date_label: string
          email: string
          id: string
          message?: string
          name: string
          phone: string
          status?: string
          submitted_at?: string
          time_label: string
          type: string
          updated_at?: string
        }
        Update: {
          company?: string
          confirmation_code?: string
          date_label?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string
          status?: string
          submitted_at?: string
          time_label?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string | null
          id: string
          investor_id: string | null
          location: string | null
          meeting_date: string | null
          meeting_link: string | null
          meeting_type: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          investor_id?: string | null
          location?: string | null
          meeting_date?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          investor_id?: string | null
          location?: string | null
          meeting_date?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "legacy_investors"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          id: string
          media_asset_id: string
          message_id: string
          position: number
        }
        Insert: {
          id?: string
          media_asset_id: string
          message_id: string
          position?: number
        }
        Update: {
          id?: string
          media_asset_id?: string
          message_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          broadcast_id: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          investor_id: string | null
          is_closed: boolean
          last_message_at: string | null
          subject: string
          thread_kind: Database["public"]["Enums"]["thread_kind"]
          updated_at: string
        }
        Insert: {
          broadcast_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string | null
          is_closed?: boolean
          last_message_at?: string | null
          subject: string
          thread_kind?: Database["public"]["Enums"]["thread_kind"]
          updated_at?: string
        }
        Update: {
          broadcast_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string | null
          is_closed?: boolean
          last_message_at?: string | null
          subject?: string
          thread_kind?: Database["public"]["Enums"]["thread_kind"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_rich: Json
          body_text: string
          edited_at: string | null
          id: string
          is_system: boolean
          sender_id: string | null
          sender_label: string | null
          sent_at: string
          thread_id: string
        }
        Insert: {
          body_rich?: Json
          body_text: string
          edited_at?: string | null
          id?: string
          is_system?: boolean
          sender_id?: string | null
          sender_label?: string | null
          sent_at?: string
          thread_id: string
        }
        Update: {
          body_rich?: Json
          body_text?: string
          edited_at?: string | null
          id?: string
          is_system?: boolean
          sender_id?: string | null
          sender_label?: string | null
          sent_at?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: Database["public"]["Enums"]["delivery_channel"]
          created_at: string
          id: string
          last_error: string | null
          notification_id: string
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          action_url?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_holdings: {
        Row: {
          acquisition_at: string
          acquisition_reference: string | null
          created_at: string
          created_by: string | null
          id: string
          investor_id: string
          notes: string | null
          offering_id: string
          ownership_bps: number
          status: Database["public"]["Enums"]["ownership_holding_status"]
          transfer_eligible_at: string
          units: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquisition_at?: string
          acquisition_reference?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id: string
          notes?: string | null
          offering_id: string
          ownership_bps: number
          status?: Database["public"]["Enums"]["ownership_holding_status"]
          transfer_eligible_at: string
          units: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquisition_at?: string
          acquisition_reference?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string
          notes?: string | null
          offering_id?: string
          ownership_bps?: number
          status?: Database["public"]["Enums"]["ownership_holding_status"]
          transfer_eligible_at?: string
          units?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_holdings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_holdings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_holdings_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "ownership_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_holdings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_inheritance: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          beneficiary_email: string | null
          beneficiary_name: string
          beneficiary_phone: string | null
          completed_at: string | null
          created_at: string
          current_investor_id: string
          holding_id: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["ownership_inheritance_status"]
          units: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_email?: string | null
          beneficiary_name: string
          beneficiary_phone?: string | null
          completed_at?: string | null
          created_at?: string
          current_investor_id: string
          holding_id: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["ownership_inheritance_status"]
          units: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          beneficiary_email?: string | null
          beneficiary_name?: string
          beneficiary_phone?: string | null
          completed_at?: string | null
          created_at?: string
          current_investor_id?: string
          holding_id?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["ownership_inheritance_status"]
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_inheritance_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_inheritance_current_investor_id_fkey"
            columns: ["current_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_inheritance_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "ownership_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_offerings: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          distribution_cadence_months: number
          effective_from: string | null
          effective_until: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["ownership_offering_status"]
          total_offered_bps: number
          total_units: number
          transfer_lock_months: number
          unit_ownership_bps: number
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          distribution_cadence_months?: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["ownership_offering_status"]
          total_offered_bps: number
          total_units: number
          transfer_lock_months?: number
          unit_ownership_bps: number
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          distribution_cadence_months?: number
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["ownership_offering_status"]
          total_offered_bps?: number
          total_units?: number
          transfer_lock_months?: number
          unit_ownership_bps?: number
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_offerings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_offerings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          eligible_at: string
          from_investor_id: string
          holding_id: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["ownership_transfer_status"]
          to_investor_id: string | null
          units: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          eligible_at: string
          from_investor_id: string
          holding_id: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["ownership_transfer_status"]
          to_investor_id?: string | null
          units: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          eligible_at?: string
          from_investor_id?: string
          holding_id?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["ownership_transfer_status"]
          to_investor_id?: string | null
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transfers_from_investor_id_fkey"
            columns: ["from_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transfers_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "ownership_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transfers_to_investor_id_fkey"
            columns: ["to_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          is_dangerous: boolean
          key: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          is_dangerous?: boolean
          key: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          is_dangerous?: boolean
          key?: string
          module?: string
        }
        Relationships: []
      }
      portal_content: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          page: string
          section: string
          slug: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          page: string
          section: string
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          page?: string
          section?: string
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portal_inquiries: {
        Row: {
          converted_investor_id: string | null
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          ip_hash: string | null
          message: string
          name: string
          organization: string | null
          phone: string | null
          source_page: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          thread_id: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          converted_investor_id?: string | null
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          organization?: string | null
          phone?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          thread_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          converted_investor_id?: string | null
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          organization?: string | null
          phone?: string | null
          source_page?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          thread_id?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_inquiries_converted_investor_id_fkey"
            columns: ["converted_investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_inquiries_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_inquiries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_navigation: {
        Row: {
          created_at: string
          href: string
          icon: string | null
          id: string
          is_visible: boolean
          label: string
          location: Database["public"]["Enums"]["nav_location"]
          parent_id: string | null
          position: number
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          icon?: string | null
          id?: string
          is_visible?: boolean
          label: string
          location: Database["public"]["Enums"]["nav_location"]
          parent_id?: string | null
          position?: number
          target?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          icon?: string | null
          id?: string
          is_visible?: boolean
          label?: string
          location?: Database["public"]["Enums"]["nav_location"]
          parent_id?: string | null
          position?: number
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_navigation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "portal_navigation"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_pages: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          page_kind: Database["public"]["Enums"]["page_kind"]
          position: number
          published_at: string | null
          seo: Json
          slug: string
          status: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          page_kind?: Database["public"]["Enums"]["page_kind"]
          position?: number
          published_at?: string | null
          seo?: Json
          slug: string
          status?: Database["public"]["Enums"]["publication_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          page_kind?: Database["public"]["Enums"]["page_kind"]
          position?: number
          published_at?: string | null
          seo?: Json
          slug?: string
          status?: Database["public"]["Enums"]["publication_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_section_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_note: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          section_id: string
          status: Database["public"]["Enums"]["publication_status"]
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          section_id: string
          status?: Database["public"]["Enums"]["publication_status"]
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          section_id?: string
          status?: Database["public"]["Enums"]["publication_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "portal_section_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_section_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_section_versions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "portal_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sections: {
        Row: {
          anchor_id: string | null
          created_at: string
          current_version_id: string | null
          id: string
          is_visible: boolean
          page_id: string
          position: number
          published_version_id: string | null
          section_kind: Database["public"]["Enums"]["section_kind"]
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
        }
        Insert: {
          anchor_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          is_visible?: boolean
          page_id: string
          position: number
          published_version_id?: string | null
          section_kind: Database["public"]["Enums"]["section_kind"]
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Update: {
          anchor_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          is_visible?: boolean
          page_id?: string
          position?: number
          published_version_id?: string | null
          section_kind?: Database["public"]["Enums"]["section_kind"]
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_sections_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "portal_section_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "portal_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_sections_published_version_fk"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "portal_section_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_theme: {
        Row: {
          color_overrides: Json
          created_at: string
          default_color_scheme: string
          favicon_asset_id: string | null
          id: string
          is_active: boolean
          logo_asset_id: string | null
          logo_dark_asset_id: string | null
          name: string
          og_image_asset_id: string | null
          radius_preset: string
          typography_preset: string
          updated_at: string
        }
        Insert: {
          color_overrides?: Json
          created_at?: string
          default_color_scheme?: string
          favicon_asset_id?: string | null
          id?: string
          is_active?: boolean
          logo_asset_id?: string | null
          logo_dark_asset_id?: string | null
          name: string
          og_image_asset_id?: string | null
          radius_preset?: string
          typography_preset?: string
          updated_at?: string
        }
        Update: {
          color_overrides?: Json
          created_at?: string
          default_color_scheme?: string
          favicon_asset_id?: string | null
          id?: string
          is_active?: boolean
          logo_asset_id?: string | null
          logo_dark_asset_id?: string | null
          name?: string
          og_image_asset_id?: string | null
          radius_preset?: string
          typography_preset?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_theme_favicon_asset_id_fkey"
            columns: ["favicon_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_theme_logo_asset_id_fkey"
            columns: ["logo_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_theme_logo_dark_asset_id_fkey"
            columns: ["logo_dark_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_theme_og_image_asset_id_fkey"
            columns: ["og_image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_distribution_allocations: {
        Row: {
          allocation_amount: number
          created_at: string
          distribution_id: string
          holding_id: string
          id: string
          investor_id: string
          investor_pool_share_bps: number
          ownership_bps: number
          paid_at: string | null
          payment_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allocation_amount?: number
          created_at?: string
          distribution_id: string
          holding_id: string
          id?: string
          investor_id: string
          investor_pool_share_bps: number
          ownership_bps: number
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocation_amount?: number
          created_at?: string
          distribution_id?: string
          holding_id?: string
          id?: string
          investor_id?: string
          investor_pool_share_bps?: number
          ownership_bps?: number
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_distribution_allocations_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "profit_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distribution_allocations_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "ownership_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distribution_allocations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_distribution_payment_proofs: {
        Row: {
          allocation_id: string
          file_size_bytes: number
          id: string
          investor_id: string
          mime_type: string
          original_file_name: string
          payment_reference: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          allocation_id: string
          file_size_bytes: number
          id?: string
          investor_id: string
          mime_type: string
          original_file_name: string
          payment_reference?: string | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          allocation_id?: string
          file_size_bytes?: number
          id?: string
          investor_id?: string
          mime_type?: string
          original_file_name?: string
          payment_reference?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profit_distribution_payment_proofs_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "profit_distribution_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distribution_payment_proofs_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distribution_payment_proofs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      profit_distributions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_share_bps: number
          created_at: string
          created_by: string | null
          id: string
          investor_pool_amount: number
          investor_pool_bps: number
          notes: string | null
          offering_id: string
          opex_amount: number
          paid_at: string | null
          period_end: string
          period_start: string
          profit_amount: number
          revenue_amount: number
          status: Database["public"]["Enums"]["profit_distribution_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_share_bps?: number
          created_at?: string
          created_by?: string | null
          id?: string
          investor_pool_amount?: number
          investor_pool_bps?: number
          notes?: string | null
          offering_id: string
          opex_amount?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          profit_amount?: number
          revenue_amount?: number
          status?: Database["public"]["Enums"]["profit_distribution_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_share_bps?: number
          created_at?: string
          created_by?: string | null
          id?: string
          investor_pool_amount?: number
          investor_pool_bps?: number
          notes?: string | null
          offering_id?: string
          opex_amount?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          profit_amount?: number
          revenue_amount?: number
          status?: Database["public"]["Enums"]["profit_distribution_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profit_distributions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distributions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distributions_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "ownership_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profit_distributions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          bucket: string
          hits?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          bucket?: string
          hits?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      realtime_emit_failures: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string
          id: string
          kind: string
          topic: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message: string
          id?: string
          kind: string
          topic: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string
          id?: string
          kind?: string
          topic?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          granted_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          id: string
          is_system: boolean
          key: string
          name: string
          permission_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          key: string
          name: string
          permission_version?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          permission_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          joined_at: string
          muted_at: string | null
          role: Database["public"]["Enums"]["participant_role"]
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          muted_at?: string | null
          role: Database["public"]["Enums"]["participant_role"]
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          muted_at?: string | null
          role?: Database["public"]["Enums"]["participant_role"]
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_path: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_seen_at: string | null
          locale: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_path?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_path?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_admin_account: { Args: { p_admin_id: string }; Returns: Json }
      consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_body?: string
          p_entity_id?: string
          p_entity_type?: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_payload?: Json
          p_recipient_id: string
          p_title: string
        }
        Returns: string
      }
      current_principal: { Args: never; Returns: Json }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      deactivate_admin_account: {
        Args: { p_admin_id: string; p_reason?: string }
        Returns: Json
      }
      provision_admin_account: {
        Args: {
          p_created_by?: string
          p_email: string
          p_full_name: string
          p_role_id: string
          p_title?: string
          p_user_id: string
        }
        Returns: Json
      }
      provision_investor_account: {
        Args: {
          p_address?: string
          p_application_note?: string
          p_city?: string
          p_country?: string
          p_email: string
          p_full_name: string
          p_identity_number_hash?: string
          p_investor_type: Database["public"]["Enums"]["investor_type"]
          p_legal_name: string
          p_organization_name?: string
          p_organization_role?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: Json
      }
      prune_rate_limits: {
        Args: { p_older_than_seconds?: number }
        Returns: number
      }
      transition_investor: {
        Args: {
          p_investor_id: string
          p_reason?: string
          p_to_status: Database["public"]["Enums"]["investor_status"]
        }
        Returns: Database["public"]["Enums"]["investor_status"]
      }
      update_admin_account: {
        Args: {
          p_admin_id: string
          p_full_name: string
          p_role_id: string
          p_title?: string
        }
        Returns: Json
      }
      update_role_permissions_atomic: {
        Args: {
          p_description: string
          p_expected_permission_version: number
          p_name: string
          p_permission_ids: string[]
          p_role_id: string
        }
        Returns: {
          permission_version: number
          role_description: string
          role_id: string
          role_key: string
          role_name: string
        }[]
      }
    }
    Enums: {
      account_status: "active" | "disabled"
      account_type: "admin" | "investor"
      app_role: "admin" | "ir"
      asset_visibility: "public" | "internal" | "restricted"
      broadcast_audience: "all_investors" | "by_status" | "selected"
      delivery_channel: "email"
      delivery_status: "pending" | "sent" | "failed" | "skipped"
      document_kind:
        | "investment_proposal"
        | "pitch_deck"
        | "investor_report"
        | "business_update"
        | "supporting"
      financial_category:
        | "revenue"
        | "expense"
        | "asset"
        | "liability"
        | "equity"
        | "operating"
        | "investing"
        | "financing"
      financial_source: "internal" | "reviewed" | "audited"
      financial_statement: "income" | "balance" | "cash_flow"
      inquiry_status: "new" | "in_progress" | "converted" | "closed"
      investor_status:
        | "prospective"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "active"
        | "inactive"
      investor_type: "individual" | "institution"
      nav_location: "header" | "footer" | "legal" | "social"
      notification_kind:
        | "investor_application_received"
        | "investor_approved"
        | "investor_rejected"
        | "investor_deactivated"
        | "document_published"
        | "document_shared"
        | "financial_report_published"
        | "investor_report_published"
        | "company_update"
        | "message_received"
        | "inquiry_received"
        | "account_invited"
      ownership_holding_status:
        | "reserved"
        | "active"
        | "transferred"
        | "cancelled"
      ownership_inheritance_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      ownership_offering_status:
        | "draft"
        | "open"
        | "paused"
        | "closed"
        | "archived"
      ownership_transfer_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      page_kind: "home" | "standard" | "legal"
      participant_role: "investor" | "admin"
      period_status: "open" | "closed" | "locked"
      period_type: "monthly" | "quarterly" | "yearly"
      profit_distribution_status:
        | "draft"
        | "review"
        | "approved"
        | "payable"
        | "paid"
        | "cancelled"
      publication_status:
        | "draft"
        | "review"
        | "approved"
        | "published"
        | "archived"
      section_kind:
        | "hero_3d"
        | "intro"
        | "vision_mission"
        | "business_overview"
        | "growth_story"
        | "ecosystem"
        | "investment_info"
        | "milestones"
        | "strategic_direction"
        | "financial_highlights"
        | "investor_updates"
        | "documents"
        | "contact_cta"
        | "legal_notice"
        | "rich_content"
        | "stat_grid"
        | "logo_wall"
        | "faq"
      thread_kind: "investor_admin" | "broadcast" | "portal_inquiry"
      user_status: "active" | "inactive"
      visibility: "public" | "investors" | "restricted" | "internal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  app: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "disabled"],
      account_type: ["admin", "investor"],
      app_role: ["admin", "ir"],
      asset_visibility: ["public", "internal", "restricted"],
      broadcast_audience: ["all_investors", "by_status", "selected"],
      delivery_channel: ["email"],
      delivery_status: ["pending", "sent", "failed", "skipped"],
      document_kind: [
        "investment_proposal",
        "pitch_deck",
        "investor_report",
        "business_update",
        "supporting",
      ],
      financial_category: [
        "revenue",
        "expense",
        "asset",
        "liability",
        "equity",
        "operating",
        "investing",
        "financing",
      ],
      financial_source: ["internal", "reviewed", "audited"],
      financial_statement: ["income", "balance", "cash_flow"],
      inquiry_status: ["new", "in_progress", "converted", "closed"],
      investor_status: [
        "prospective",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "active",
        "inactive",
      ],
      investor_type: ["individual", "institution"],
      nav_location: ["header", "footer", "legal", "social"],
      notification_kind: [
        "investor_application_received",
        "investor_approved",
        "investor_rejected",
        "investor_deactivated",
        "document_published",
        "document_shared",
        "financial_report_published",
        "investor_report_published",
        "company_update",
        "message_received",
        "inquiry_received",
        "account_invited",
      ],
      ownership_holding_status: [
        "reserved",
        "active",
        "transferred",
        "cancelled",
      ],
      ownership_inheritance_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      ownership_offering_status: [
        "draft",
        "open",
        "paused",
        "closed",
        "archived",
      ],
      ownership_transfer_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      page_kind: ["home", "standard", "legal"],
      participant_role: ["investor", "admin"],
      period_status: ["open", "closed", "locked"],
      period_type: ["monthly", "quarterly", "yearly"],
      profit_distribution_status: [
        "draft",
        "review",
        "approved",
        "payable",
        "paid",
        "cancelled",
      ],
      publication_status: [
        "draft",
        "review",
        "approved",
        "published",
        "archived",
      ],
      section_kind: [
        "hero_3d",
        "intro",
        "vision_mission",
        "business_overview",
        "growth_story",
        "ecosystem",
        "investment_info",
        "milestones",
        "strategic_direction",
        "financial_highlights",
        "investor_updates",
        "documents",
        "contact_cta",
        "legal_notice",
        "rich_content",
        "stat_grid",
        "logo_wall",
        "faq",
      ],
      thread_kind: ["investor_admin", "broadcast", "portal_inquiry"],
      user_status: ["active", "inactive"],
      visibility: ["public", "investors", "restricted", "internal"],
    },
  },
} as const

