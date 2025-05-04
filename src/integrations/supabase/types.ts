export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          game_id: string
          id?: string
          is_donation?: boolean
          memo?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          game_id?: string
          id?: string
          is_donation?: boolean
          memo?: string | null
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
          carryover_jackpot: number
          created_at: string
          end_date: string | null
          game_number: number
          id: string
          jackpot_percentage: number
          name: string
          organization_net_profit: number
          organization_percentage: number
          start_date: string
          ticket_price: number
          total_donations: number
          total_expenses: number
          total_payouts: number
          total_sales: number
        }
        Insert: {
          carryover_jackpot?: number
          created_at?: string
          end_date?: string | null
          game_number: number
          id?: string
          jackpot_percentage?: number
          name: string
          organization_net_profit?: number
          organization_percentage?: number
          start_date: string
          ticket_price?: number
          total_donations?: number
          total_expenses?: number
          total_payouts?: number
          total_sales?: number
        }
        Update: {
          carryover_jackpot?: number
          created_at?: string
          end_date?: string | null
          game_number?: number
          id?: string
          jackpot_percentage?: number
          name?: string
          organization_net_profit?: number
          organization_percentage?: number
          start_date?: string
          ticket_price?: number
          total_donations?: number
          total_expenses?: number
          total_payouts?: number
          total_sales?: number
        }
        Relationships: []
      }
      ticket_sales: {
        Row: {
          amount_collected: number
          created_at: string
          cumulative_collected: number
          date: string
          ending_jackpot_total: number
          game_id: string
          id: string
          jackpot_total: number
          organization_total: number
          ticket_price: number
          tickets_sold: number
          week_id: string
          weekly_payout_amount: number
        }
        Insert: {
          amount_collected: number
          created_at?: string
          cumulative_collected: number
          date: string
          ending_jackpot_total: number
          game_id: string
          id?: string
          jackpot_total: number
          organization_total: number
          ticket_price: number
          tickets_sold: number
          week_id: string
          weekly_payout_amount?: number
        }
        Update: {
          amount_collected?: number
          created_at?: string
          cumulative_collected?: number
          date?: string
          ending_jackpot_total?: number
          game_id?: string
          id?: string
          jackpot_total?: number
          organization_total?: number
          ticket_price?: number
          tickets_sold?: number
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
          card_selected: string | null
          created_at: string
          end_date: string
          game_id: string
          id: string
          slot_chosen: number | null
          start_date: string
          week_number: number
          weekly_payout: number
          weekly_sales: number
          weekly_tickets_sold: number
          winner_name: string | null
          winner_present: boolean | null
        }
        Insert: {
          card_selected?: string | null
          created_at?: string
          end_date: string
          game_id: string
          id?: string
          slot_chosen?: number | null
          start_date: string
          week_number: number
          weekly_payout?: number
          weekly_sales?: number
          weekly_tickets_sold?: number
          winner_name?: string | null
          winner_present?: boolean | null
        }
        Update: {
          card_selected?: string | null
          created_at?: string
          end_date?: string
          game_id?: string
          id?: string
          slot_chosen?: number | null
          start_date?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
