export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      configurations: {
        Row: {
          card_payouts: Json
          id: string
          jackpot_percentage: number
          minimum_starting_jackpot: number | null
          organization_percentage: number
          penalty_percentage: number
          penalty_to_organization: boolean
          ticket_price: number
          updated_at: string
          user_id: string | null
          version: number | null
        }
        Insert: {
          card_payouts?: Json
          id?: string
          jackpot_percentage?: number
          minimum_starting_jackpot?: number | null
          organization_percentage?: number
          penalty_percentage?: number
          penalty_to_organization?: boolean
          ticket_price?: number
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Update: {
          card_payouts?: Json
          id?: string
          jackpot_percentage?: number
          minimum_starting_jackpot?: number | null
          organization_percentage?: number
          penalty_percentage?: number
          penalty_to_organization?: boolean
          ticket_price?: number
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          date: string
          game_id: string
          id: string
          is_donation: boolean
          memo: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          game_id: string
          id?: string
          is_donation?: boolean
          memo?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          game_id?: string
          id?: string
          is_donation?: boolean
          memo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          actual_organization_net_profit: number | null
          card_payouts: Json | null
          carryover_jackpot: number
          configuration_version: number | null
          created_at: string
          end_date: string | null
          final_jackpot_payout: number | null
          game_duration_weeks: number | null
          game_number: number
          game_profit_loss: number
          id: string
          jackpot_contribution_to_next_game: number
          jackpot_percentage: number
          jackpot_shortfall_covered: number | null
          minimum_starting_jackpot: number | null
          name: string
          net_available_for_final_winner: number | null
          organization_net_profit: number
          organization_percentage: number
          start_date: string
          ticket_price: number
          total_donations: number
          total_expenses: number
          total_jackpot_contributions: number | null
          total_payouts: number
          total_sales: number
          user_id: string
          weekly_payouts_distributed: number | null
        }
        Insert: {
          actual_organization_net_profit?: number | null
          card_payouts?: Json | null
          carryover_jackpot?: number
          configuration_version?: number | null
          created_at?: string
          end_date?: string | null
          final_jackpot_payout?: number | null
          game_duration_weeks?: number | null
          game_number: number
          game_profit_loss?: number
          id?: string
          jackpot_contribution_to_next_game?: number
          jackpot_percentage?: number
          jackpot_shortfall_covered?: number | null
          minimum_starting_jackpot?: number | null
          name: string
          net_available_for_final_winner?: number | null
          organization_net_profit?: number
          organization_percentage?: number
          start_date: string
          ticket_price?: number
          total_donations?: number
          total_expenses?: number
          total_jackpot_contributions?: number | null
          total_payouts?: number
          total_sales?: number
          user_id: string
          weekly_payouts_distributed?: number | null
        }
        Update: {
          actual_organization_net_profit?: number | null
          card_payouts?: Json | null
          carryover_jackpot?: number
          configuration_version?: number | null
          created_at?: string
          end_date?: string | null
          final_jackpot_payout?: number | null
          game_duration_weeks?: number | null
          game_number?: number
          game_profit_loss?: number
          id?: string
          jackpot_contribution_to_next_game?: number
          jackpot_percentage?: number
          jackpot_shortfall_covered?: number | null
          minimum_starting_jackpot?: number | null
          name?: string
          net_available_for_final_winner?: number | null
          organization_net_profit?: number
          organization_percentage?: number
          start_date?: string
          ticket_price?: number
          total_donations?: number
          total_expenses?: number
          total_jackpot_contributions?: number | null
          total_payouts?: number
          total_sales?: number
          user_id?: string
          weekly_payouts_distributed?: number | null
        }
        Relationships: []
      }
      organization_rules: {
        Row: {
          created_at: string
          id: string
          organization_name: string
          rules_content: string
          startup_costs: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_name?: string
          rules_content: string
          startup_costs?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_name?: string
          rules_content?: string
          startup_costs?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_sales: {
        Row: {
          amount_collected: number
          created_at: string
          cumulative_collected: number
          date: string
          displayed_jackpot_total: number | null
          ending_jackpot_total: number
          game_id: string
          id: string
          jackpot_contributions_total: number | null
          jackpot_total: number
          organization_total: number
          ticket_price: number
          tickets_sold: number
          user_id: string
          week_id: string
          weekly_payout_amount: number
        }
        Insert: {
          amount_collected: number
          created_at?: string
          cumulative_collected: number
          date: string
          displayed_jackpot_total?: number | null
          ending_jackpot_total: number
          game_id: string
          id?: string
          jackpot_contributions_total?: number | null
          jackpot_total: number
          organization_total: number
          ticket_price: number
          tickets_sold: number
          user_id: string
          week_id: string
          weekly_payout_amount?: number
        }
        Update: {
          amount_collected?: number
          created_at?: string
          cumulative_collected?: number
          date?: string
          displayed_jackpot_total?: number | null
          ending_jackpot_total?: number
          game_id?: string
          id?: string
          jackpot_contributions_total?: number | null
          jackpot_total?: number
          organization_total?: number
          ticket_price?: number
          tickets_sold?: number
          user_id?: string
          week_id?: string
          weekly_payout_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          about: string | null
          created_at: string
          email: string
          id: string
          logo_url: string | null
          organization_name: string | null
          role: string
        }
        Insert: {
          about?: string | null
          created_at?: string
          email: string
          id: string
          logo_url?: string | null
          organization_name?: string | null
          role: string
        }
        Update: {
          about?: string | null
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          organization_name?: string | null
          role?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          authorized_signature_name: string | null
          card_selected: string | null
          created_at: string
          end_date: string
          ending_jackpot: number | null
          game_id: string
          id: string
          slot_chosen: number | null
          start_date: string
          user_id: string
          week_number: number
          weekly_payout: number
          weekly_sales: number
          weekly_tickets_sold: number
          winner_name: string | null
          winner_present: boolean | null
        }
        Insert: {
          authorized_signature_name?: string | null
          card_selected?: string | null
          created_at?: string
          end_date: string
          ending_jackpot?: number | null
          game_id: string
          id?: string
          slot_chosen?: number | null
          start_date: string
          user_id: string
          week_number: number
          weekly_payout?: number
          weekly_sales?: number
          weekly_tickets_sold?: number
          winner_name?: string | null
          winner_present?: boolean | null
        }
        Update: {
          authorized_signature_name?: string | null
          card_selected?: string | null
          created_at?: string
          end_date?: string
          ending_jackpot?: number | null
          game_id?: string
          id?: string
          slot_chosen?: number | null
          start_date?: string
          user_id?: string
          week_number?: number
          weekly_payout?: number
          weekly_sales?: number
          weekly_tickets_sold?: number
          winner_name?: string | null
          winner_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "weeks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_displayed_jackpot: {
        Args: {
          contributions_total: number
          minimum_jackpot: number
          carryover_jackpot?: number
        }
        Returns: number
      }
      get_organization_data: {
        Args: { target_user_id: string }
        Returns: {
          user_id: string
          email: string
          organization_name: string
          logo_url: string
          about: string
          role: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          about: string | null
          created_at: string
          email: string
          id: string
          logo_url: string | null
          organization_name: string | null
          role: string
        }[]
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_user_profile: {
        Args: {
          p_user_id: string
          p_organization_name: string
          p_about: string
          p_logo_url: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
