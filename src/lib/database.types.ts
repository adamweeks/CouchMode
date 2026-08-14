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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      progress_logs: {
        Row: {
          episode: number
          id: string
          logged_at: string
          note: string | null
          rewatch_id: string
          season: number
          user_id: string
        }
        Insert: {
          episode: number
          id?: string
          logged_at?: string
          note?: string | null
          rewatch_id: string
          season: number
          user_id: string
        }
        Update: {
          episode?: number
          id?: string
          logged_at?: string
          note?: string | null
          rewatch_id?: string
          season?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_logs_rewatch_id_fkey"
            columns: ["rewatch_id"]
            isOneToOne: false
            referencedRelation: "rewatches"
            referencedColumns: ["id"]
          },
        ]
      }
      rewatches: {
        Row: {
          completed_at: string | null
          id: string
          note: string | null
          service: string | null
          show_id: string
          started_at: string
          status: Database["public"]["Enums"]["rewatch_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          note?: string | null
          service?: string | null
          show_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["rewatch_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          note?: string | null
          service?: string | null
          show_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["rewatch_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewatches_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          added_at: string
          air_status: Json | null
          air_status_updated_at: string | null
          episodes_per_season: number[]
          id: string
          poster_url: string | null
          providers_updated_at: string | null
          sort_order: number | null
          streaming_providers: Json | null
          title: string
          tmdb_id: string
          total_seasons: number
          user_id: string
        }
        Insert: {
          added_at?: string
          air_status?: Json | null
          air_status_updated_at?: string | null
          episodes_per_season?: number[]
          id?: string
          poster_url?: string | null
          providers_updated_at?: string | null
          sort_order?: number | null
          streaming_providers?: Json | null
          title: string
          tmdb_id: string
          total_seasons?: number
          user_id: string
        }
        Update: {
          added_at?: string
          air_status?: Json | null
          air_status_updated_at?: string | null
          episodes_per_season?: number[]
          id?: string
          poster_url?: string | null
          providers_updated_at?: string | null
          sort_order?: number | null
          streaming_providers?: Json | null
          title?: string
          tmdb_id?: string
          total_seasons?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      admin_get_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_user_list: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      admin_get_popular_shows: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      rewatch_status: "in_progress" | "completed"
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
      rewatch_status: ["in_progress", "completed"],
    },
  },
} as const
