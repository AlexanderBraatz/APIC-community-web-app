export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          summary: string
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          summary: string
          target_id?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          summary?: string
          target_id?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          note?: string | null
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          note?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_map_locations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          latitude: number
          longitude: number
          post_id: string
          source_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          latitude: number
          longitude: number
          post_id: string
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          latitude?: number
          longitude?: number
          post_id?: string
          source_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_map_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_map_locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tag_assignments: {
        Row: {
          listing_id: string
          tag_id: string
        }
        Insert: {
          listing_id: string
          tag_id: string
        }
        Update: {
          listing_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_tag_assignments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "listing_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tag_assignments_backup_20260804: {
        Row: {
          listing_id: string | null
          tag_id: string | null
        }
        Insert: {
          listing_id?: string | null
          tag_id?: string | null
        }
        Update: {
          listing_id?: string | null
          tag_id?: string | null
        }
        Relationships: []
      }
      listing_tags: {
        Row: {
          aliases: string[]
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_tags_backup_20260804: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["listing_category"]
          contacts: Json
          created_at: string
          created_by: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          opening_hours: Json | null
          places_enrichment_notes: string | null
          places_enrichment_status: Database["public"]["Enums"]["places_enrichment_status"]
          places_primary_type: string | null
          places_types: string[]
          source_url: string | null
          type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["listing_category"]
          contacts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          opening_hours?: Json | null
          places_enrichment_notes?: string | null
          places_enrichment_status?: Database["public"]["Enums"]["places_enrichment_status"]
          places_primary_type?: string | null
          places_types?: string[]
          source_url?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["listing_category"]
          contacts?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          opening_hours?: Json | null
          places_enrichment_notes?: string | null
          places_enrichment_status?: Database["public"]["Enums"]["places_enrichment_status"]
          places_primary_type?: string | null
          places_types?: string[]
          source_url?: string | null
          type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings_backup_20260804: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["listing_category"] | null
          contact: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          remark: string | null
          source_url: string | null
          type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["listing_category"] | null
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          remark?: string | null
          source_url?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["listing_category"] | null
          contact?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          remark?: string | null
          source_url?: string | null
          type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          event_bar_color: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          event_bar_color?: string | null
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          event_bar_color?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      privacy_preferences: {
        Row: {
          analytics_enabled: boolean
          created_at: string
          preferences_answered_at: string
          session_replay_enabled: boolean
          terms_accepted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_enabled?: boolean
          created_at?: string
          preferences_answered_at?: string
          session_replay_enabled?: boolean
          terms_accepted_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_enabled?: boolean
          created_at?: string
          preferences_answered_at?: string
          session_replay_enabled?: boolean
          terms_accepted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_preferences: {
        Row: {
          created_at: string
          font_size: string
          pinned_member_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          font_size?: string
          pinned_member_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          font_size?: string
          pinned_member_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          cancelled_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_at: string
          invited_by: string
          last_sent_at: string
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          last_sent_at?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          last_sent_at?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string
          event_bar_color: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      save_attendance_batch: {
        Args: { p_delete_ids?: string[]; p_stays: Json }
        Returns: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "attendance"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      write_admin_audit: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_summary: string
          p_target_id: string
          p_target_type: string
        }
        Returns: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          summary: string
          target_id: string | null
          target_type: string
          user_agent: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admin_audit_log"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      listing_category:
        | "food-dining"
        | "services-maintenance"
        | "health-wellness"
        | "shop-market"
      places_enrichment_status: "pending" | "updated" | "not_found" | "error"
      user_role: "user" | "admin"
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
  public: {
    Enums: {
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      listing_category: [
        "food-dining",
        "services-maintenance",
        "health-wellness",
        "shop-market",
      ],
      places_enrichment_status: ["pending", "updated", "not_found", "error"],
      user_role: ["user", "admin"],
    },
  },
} as const
