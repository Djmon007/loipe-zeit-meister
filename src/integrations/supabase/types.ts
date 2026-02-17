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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      diesel_entries: {
        Row: {
          created_at: string
          datum: string
          id: string
          liter: number
          tank: Database["public"]["Enums"]["diesel_tank"]
          user_id: string
        }
        Insert: {
          created_at?: string
          datum?: string
          id?: string
          liter: number
          tank: Database["public"]["Enums"]["diesel_tank"]
          user_id: string
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          liter?: number
          tank?: Database["public"]["Enums"]["diesel_tank"]
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          beleg_filename: string | null
          beleg_url: string | null
          beschreibung: string | null
          betrag: number | null
          created_at: string
          datum: string
          id: string
          time_entry_id: string | null
          user_id: string
        }
        Insert: {
          beleg_filename?: string | null
          beleg_url?: string | null
          beschreibung?: string | null
          betrag?: number | null
          created_at?: string
          datum?: string
          id?: string
          time_entry_id?: string | null
          user_id: string
        }
        Update: {
          beleg_filename?: string | null
          beleg_url?: string | null
          beschreibung?: string | null
          betrag?: number | null
          created_at?: string
          datum?: string
          id?: string
          time_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      kasse_tageskarten: {
        Row: {
          beleg_filename: string | null
          beleg_url: string | null
          beschreibung: string | null
          betrag: number
          created_at: string
          datum: string
          id: string
          user_id: string
        }
        Insert: {
          beleg_filename?: string | null
          beleg_url?: string | null
          beschreibung?: string | null
          betrag: number
          created_at?: string
          datum?: string
          id?: string
          user_id: string
        }
        Update: {
          beleg_filename?: string | null
          beleg_url?: string | null
          beschreibung?: string | null
          betrag?: number
          created_at?: string
          datum?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      loipen_config: {
        Row: {
          column_key: string | null
          created_at: string
          has_klassisch: boolean
          has_skating: boolean
          has_skipiste: boolean
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          column_key?: string | null
          created_at?: string
          has_klassisch?: boolean
          has_skating?: boolean
          has_skipiste?: boolean
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          column_key?: string | null
          created_at?: string
          has_klassisch?: boolean
          has_skating?: boolean
          has_skipiste?: boolean
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      loipen_protokoll: {
        Row: {
          created_at: string
          datum: string
          haetzingen_linthal_klassisch: boolean | null
          haetzingen_linthal_skating: boolean | null
          id: string
          luchsingen_skistuebli_klassisch: boolean | null
          luchsingen_skistuebli_skating: boolean | null
          nidfurn_leuggelbach_klassisch: boolean | null
          nidfurn_leuggelbach_skating: boolean | null
          rundkurs_leuggelbach_klassisch: boolean | null
          rundkurs_leuggelbach_skating: boolean | null
          saeatli_boden_klassisch: boolean | null
          saeatli_boden_skating: boolean | null
          schwanden_nidfurn_klassisch: boolean | null
          schwanden_nidfurn_skating: boolean | null
          skilift_lo_klassisch: boolean | null
          skilift_lo_skating: boolean | null
          time_entry_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          datum?: string
          haetzingen_linthal_klassisch?: boolean | null
          haetzingen_linthal_skating?: boolean | null
          id?: string
          luchsingen_skistuebli_klassisch?: boolean | null
          luchsingen_skistuebli_skating?: boolean | null
          nidfurn_leuggelbach_klassisch?: boolean | null
          nidfurn_leuggelbach_skating?: boolean | null
          rundkurs_leuggelbach_klassisch?: boolean | null
          rundkurs_leuggelbach_skating?: boolean | null
          saeatli_boden_klassisch?: boolean | null
          saeatli_boden_skating?: boolean | null
          schwanden_nidfurn_klassisch?: boolean | null
          schwanden_nidfurn_skating?: boolean | null
          skilift_lo_klassisch?: boolean | null
          skilift_lo_skating?: boolean | null
          time_entry_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          datum?: string
          haetzingen_linthal_klassisch?: boolean | null
          haetzingen_linthal_skating?: boolean | null
          id?: string
          luchsingen_skistuebli_klassisch?: boolean | null
          luchsingen_skistuebli_skating?: boolean | null
          nidfurn_leuggelbach_klassisch?: boolean | null
          nidfurn_leuggelbach_skating?: boolean | null
          rundkurs_leuggelbach_klassisch?: boolean | null
          rundkurs_leuggelbach_skating?: boolean | null
          saeatli_boden_klassisch?: boolean | null
          saeatli_boden_skating?: boolean | null
          schwanden_nidfurn_klassisch?: boolean | null
          schwanden_nidfurn_skating?: boolean | null
          skilift_lo_klassisch?: boolean | null
          skilift_lo_skating?: boolean | null
          time_entry_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loipen_protokoll_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      loipen_protokoll_entries: {
        Row: {
          created_at: string
          datum: string
          id: string
          klassisch: boolean
          loipe_config_id: string
          skating: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          datum?: string
          id?: string
          klassisch?: boolean
          loipe_config_id: string
          skating?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          datum?: string
          id?: string
          klassisch?: boolean
          loipe_config_id?: string
          skating?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loipen_protokoll_entries_loipe_config_id_fkey"
            columns: ["loipe_config_id"]
            isOneToOne: false
            referencedRelation: "loipen_config"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nachname: string
          updated_at: string
          user_id: string
          vorname: string
        }
        Insert: {
          created_at?: string
          id?: string
          nachname: string
          updated_at?: string
          user_id: string
          vorname: string
        }
        Update: {
          created_at?: string
          id?: string
          nachname?: string
          updated_at?: string
          user_id?: string
          vorname?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          arbeit: string
          created_at: string
          datum: string
          id: string
          start_zeit: string | null
          stopp_zeit: string | null
          total_stunden: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arbeit: string
          created_at?: string
          datum?: string
          id?: string
          start_zeit?: string | null
          stopp_zeit?: string | null
          total_stunden?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arbeit?: string
          created_at?: string
          datum?: string
          id?: string
          start_zeit?: string | null
          stopp_zeit?: string | null
          total_stunden?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "worker"
      diesel_tank: "Tank Nidfurn" | "Tank Hätzingen"
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
      app_role: ["admin", "worker"],
      diesel_tank: ["Tank Nidfurn", "Tank Hätzingen"],
    },
  },
} as const
