/**
 * Hand-maintained subset for operator queries (Phase B.3). Run `bun run types:db` to merge generated
 * types when you want full-table coverage.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      jurisdictions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          level: string;
          parent_id: string | null;
          state_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      officials: {
        Row: {
          id: string;
          entity_id: string | null;
          full_name: string;
          slug: string;
          jurisdiction_id: string;
          office_type: string;
          party: string | null;
          subject_alignment: string | null;
          term_start: string | null;
          term_end: string | null;
          retention_year: number | null;
          is_current: boolean;
          photo_url: string | null;
          bio_summary: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      dossier_claims: {
        Row: {
          id: string;
          candidate_id: string | null;
          official_id: string | null;
          claim_text: string;
          category: string;
          sentiment: string | null;
          source_url: string | null;
          subject_entity_id: string | null;
          object_entity_id: string | null;
          pipeline_stage: string;
          llm_provider: string | null;
          model_id: string | null;
          api_surface: string | null;
          prompt_id: string | null;
          prompt_version: string | null;
          retrieved_at: string | null;
          groundedness_score: string | null;
          metadata: Json;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      entity_edges: {
        Row: {
          id: string;
          source_entity_id: string;
          target_entity_id: string;
          relation: string;
          confidence: number | null;
          weight: number | null;
          valid_from: string | null;
          provenance: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      entities: {
        Row: {
          id: string;
          type: string;
          canonical_name: string;
          external_ids: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          org_id: string;
          kind: string;
          target_type: string;
          target_id: string;
          payload: Json;
          delivered_at: string | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          kind: string;
          target_type: string;
          target_id: string;
          payload?: Json;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        Update: {
          read_at?: string | null;
          delivered_at?: string | null;
          payload?: Json;
        };
        Relationships: [];
      };
      user_saved_views: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          name: string;
          kind: string;
          query: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id: string;
          name: string;
          kind: string;
          query?: Json;
        };
        Update: {
          name?: string;
          kind?: string;
          query?: Json;
        };
        Relationships: [];
      };
      opinions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          court: string | null;
          published: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          bill_number: string;
          title: string;
          published: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      media_coverage: {
        Row: {
          id: string;
          headline: string;
          source_url: string | null;
          published: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
