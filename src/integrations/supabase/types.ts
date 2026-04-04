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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          hyperlink: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          hyperlink?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          hyperlink?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      cashback_offers: {
        Row: {
          cashback_percent: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          max_cashback: number
          min_deposit: number
          name: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          cashback_percent?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_cashback?: number
          min_deposit?: number
          name: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          cashback_percent?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_cashback?: number
          min_deposit?: number
          name?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      contest_entries: {
        Row: {
          contest_id: string
          created_at: string | null
          id: string
          rank: number | null
          team_id: string
          user_id: string
          winnings: number | null
        }
        Insert: {
          contest_id: string
          created_at?: string | null
          id?: string
          rank?: number | null
          team_id: string
          user_id: string
          winnings?: number | null
        }
        Update: {
          contest_id?: string
          created_at?: string | null
          id?: string
          rank?: number | null
          team_id?: string
          user_id?: string
          winnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_entries: number | null
          entry_fee: number | null
          id: string
          invite_code: string | null
          is_guaranteed: boolean | null
          match_id: string
          max_entries: number
          max_teams_per_user: number
          name: string
          prize_breakdown: Json | null
          prize_pool: number | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_entries?: number | null
          entry_fee?: number | null
          id?: string
          invite_code?: string | null
          is_guaranteed?: boolean | null
          match_id: string
          max_entries: number
          max_teams_per_user?: number
          name: string
          prize_breakdown?: Json | null
          prize_pool?: number | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_entries?: number | null
          entry_fee?: number | null
          id?: string
          invite_code?: string | null
          is_guaranteed?: boolean | null
          match_id?: string
          max_entries?: number
          max_teams_per_user?: number
          name?: string
          prize_breakdown?: Json | null
          prize_pool?: number | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          id: string
          status: string
          telegram_message_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          id?: string
          status?: string
          telegram_message_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          status?: string
          telegram_message_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          is_enabled: boolean
          key: string
          label: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          is_enabled?: boolean
          key: string
          label: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          is_enabled?: boolean
          key?: string
          label?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          aadhaar_back_url: string | null
          aadhaar_front_url: string | null
          admin_note: string | null
          id: string
          pan_card_url: string | null
          passbook_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          admin_note?: string | null
          id?: string
          pan_card_url?: string | null
          passbook_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          aadhaar_back_url?: string | null
          aadhaar_front_url?: string | null
          admin_note?: string | null
          id?: string
          pan_card_url?: string | null
          passbook_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      match_players: {
        Row: {
          fantasy_points: number | null
          id: string
          is_playing: boolean | null
          match_id: string
          player_id: string
          selected_by_percent: number | null
        }
        Insert: {
          fantasy_points?: number | null
          id?: string
          is_playing?: boolean | null
          match_id: string
          player_id: string
          selected_by_percent?: number | null
        }
        Update: {
          fantasy_points?: number | null
          id?: string
          is_playing?: boolean | null
          match_id?: string
          player_id?: string
          selected_by_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          created_by: string | null
          entry_deadline: string
          id: string
          league: string
          match_time: string
          sport: string | null
          status: string | null
          team1_color: string | null
          team1_logo: string | null
          team1_name: string
          team1_short: string
          team2_color: string | null
          team2_logo: string | null
          team2_name: string
          team2_short: string
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entry_deadline: string
          id?: string
          league: string
          match_time: string
          sport?: string | null
          status?: string | null
          team1_color?: string | null
          team1_logo?: string | null
          team1_name: string
          team1_short: string
          team2_color?: string | null
          team2_logo?: string | null
          team2_name: string
          team2_short: string
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entry_deadline?: string
          id?: string
          league?: string
          match_time?: string
          sport?: string | null
          status?: string | null
          team1_color?: string | null
          team1_logo?: string | null
          team1_name?: string
          team1_short?: string
          team2_color?: string | null
          team2_logo?: string | null
          team2_name?: string
          team2_short?: string
          venue?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string | null
          credit_value: number
          id: string
          name: string
          photo_url: string | null
          role: string
          team: string
        }
        Insert: {
          created_at?: string | null
          credit_value?: number
          id?: string
          name: string
          photo_url?: string | null
          role: string
          team: string
        }
        Update: {
          created_at?: string | null
          credit_value?: number
          id?: string
          name?: string
          photo_url?: string | null
          role?: string
          team?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          kyc_status: string | null
          name_edit_count: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string | null
          upi_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          kyc_status?: string | null
          name_edit_count?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
          upi_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          name_edit_count?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
          upi_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_sent: boolean
          message: string
          scheduled_at: string
          target_segment: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_sent?: boolean
          message: string
          scheduled_at: string
          target_segment?: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_sent?: boolean
          message?: string
          scheduled_at?: string
          target_segment?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      scoring_presets: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          id: string
          label: string
          roles: string[]
          sort_order: number
          value: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label: string
          roles?: string[]
          sort_order?: number
          value: number
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string
          roles?: string[]
          sort_order?: number
          value?: number
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          category: string
          id: string
          label: string
          rule_key: string
          sort_order: number
          updated_at: string | null
          value: number
        }
        Insert: {
          category?: string
          id?: string
          label: string
          rule_key: string
          sort_order?: number
          updated_at?: string | null
          value?: number
        }
        Update: {
          category?: string
          id?: string
          label?: string
          rule_key?: string
          sort_order?: number
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      suspicious_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_players: {
        Row: {
          id: string
          player_id: string
          team_id: string
        }
        Insert: {
          id?: string
          player_id: string
          team_id: string
        }
        Update: {
          id?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "user_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          status: string | null
          txn_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          txn_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          txn_id?: string | null
          type?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          suspended_by: string
          type: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string
          suspended_by: string
          type?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string
          suspended_by?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          match_id: string
          name: string | null
          name_edit_count: number
          total_credits: number | null
          total_points: number | null
          user_id: string
          vice_captain_id: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          name?: string | null
          name_edit_count?: number
          total_credits?: number | null
          total_points?: number | null
          user_id: string
          vice_captain_id?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          name?: string | null
          name_edit_count?: number
          total_credits?: number | null
          total_points?: number | null
          user_id?: string
          vice_captain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_teams_vice_captain_id_fkey"
            columns: ["vice_captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          bonus_balance: number | null
          deposit_balance: number | null
          id: string
          updated_at: string | null
          user_id: string
          winning_balance: number | null
        }
        Insert: {
          bonus_balance?: number | null
          deposit_balance?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
          winning_balance?: number | null
        }
        Update: {
          bonus_balance?: number | null
          deposit_balance?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
          winning_balance?: number | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string | null
          upi_id: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          upi_id: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_transition_matches: { Args: never; Returns: number }
      check_username_available: {
        Args: { desired_username: string }
        Returns: boolean
      }
      distribute_contest_winnings: {
        Args: { p_match_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_contest_with_fee: {
        Args: { p_contest_id: string; p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      process_referral_bonus: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      recalculate_player_ownership: {
        Args: { p_match_id: string }
        Returns: number
      }
      recalculate_team_points: { Args: { p_match_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
