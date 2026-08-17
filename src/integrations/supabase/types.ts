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
      case: {
        Row: {
          case_id: string
          case_number: string
          case_type: Database["public"]["Enums"]["case_type"]
          close_date: string | null
          confidentiality_level: Database["public"]["Enums"]["case_confidentiality_level"]
          created_at: string
          created_by: string | null
          current_priority_summary: string | null
          intake_date: string
          last_activity_at: string
          learner_id: string
          organization_id: string
          owner_team_member_id: string | null
          primary_stage: Database["public"]["Enums"]["case_primary_stage"]
          program_id: string | null
          risk_level: Database["public"]["Enums"]["case_risk_level"]
          start_date: string
          status: Database["public"]["Enums"]["case_status"]
          target_review_date: string | null
          transition_stage:
            | Database["public"]["Enums"]["case_transition_stage"]
            | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_id?: string
          case_number: string
          case_type?: Database["public"]["Enums"]["case_type"]
          close_date?: string | null
          confidentiality_level?: Database["public"]["Enums"]["case_confidentiality_level"]
          created_at?: string
          created_by?: string | null
          current_priority_summary?: string | null
          intake_date: string
          last_activity_at?: string
          learner_id: string
          organization_id: string
          owner_team_member_id?: string | null
          primary_stage?: Database["public"]["Enums"]["case_primary_stage"]
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["case_risk_level"]
          start_date: string
          status?: Database["public"]["Enums"]["case_status"]
          target_review_date?: string | null
          transition_stage?:
            | Database["public"]["Enums"]["case_transition_stage"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_id?: string
          case_number?: string
          case_type?: Database["public"]["Enums"]["case_type"]
          close_date?: string | null
          confidentiality_level?: Database["public"]["Enums"]["case_confidentiality_level"]
          created_at?: string
          created_by?: string | null
          current_priority_summary?: string | null
          intake_date?: string
          last_activity_at?: string
          learner_id?: string
          organization_id?: string
          owner_team_member_id?: string | null
          primary_stage?: Database["public"]["Enums"]["case_primary_stage"]
          program_id?: string | null
          risk_level?: Database["public"]["Enums"]["case_risk_level"]
          start_date?: string
          status?: Database["public"]["Enums"]["case_status"]
          target_review_date?: string | null
          transition_stage?:
            | Database["public"]["Enums"]["case_transition_stage"]
            | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_learner_id_learner_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
          {
            foreignKeyName: "case_owner_team_member_id_team_member_team_member_id_fk"
            columns: ["owner_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      case_membership: {
        Row: {
          case_id: string
          created_at: string
          ended_at: string | null
          id: string
          role: Database["public"]["Enums"]["case_membership_role"]
          started_at: string
          team_member_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["case_membership_role"]
          started_at?: string
          team_member_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["case_membership_role"]
          started_at?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_membership_case_id_case_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_membership_team_member_id_team_member_team_member_id_fk"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      learner: {
        Row: {
          created_at: string
          date_of_birth: string | null
          full_name: string
          learner_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          learner_id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          learner_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_member: {
        Row: {
          created_at: string
          full_name: string
          organization_id: string
          role: string
          team_member_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          organization_id: string
          role: string
          team_member_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          organization_id?: string
          role?: string
          team_member_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      case_confidentiality_level:
        | "standard"
        | "restricted"
        | "highly_restricted"
      case_membership_role:
        | "case_manager"
        | "special_educator"
        | "therapist"
        | "supervisor"
        | "observer"
      case_primary_stage:
        | "assessment"
        | "planning"
        | "implementation"
        | "review"
        | "transition"
      case_priority_level: "high" | "medium" | "low"
      case_risk_level: "none" | "watch" | "needs_attention" | "urgent"
      case_status: "active" | "review_due" | "closed"
      case_transition_stage:
        | "not_applicable"
        | "pre_transition"
        | "exploration"
        | "planning"
        | "vocational_training"
        | "home_based_project"
        | "active_implementation"
        | "employment_or_further_education"
        | "follow_up"
      case_type:
        | "IEP"
        | "transition"
        | "behavior"
        | "therapy"
        | "vocational"
        | "combined"
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
      case_confidentiality_level: [
        "standard",
        "restricted",
        "highly_restricted",
      ],
      case_membership_role: [
        "case_manager",
        "special_educator",
        "therapist",
        "supervisor",
        "observer",
      ],
      case_primary_stage: [
        "assessment",
        "planning",
        "implementation",
        "review",
        "transition",
      ],
      case_priority_level: ["high", "medium", "low"],
      case_risk_level: ["none", "watch", "needs_attention", "urgent"],
      case_status: ["active", "review_due", "closed"],
      case_transition_stage: [
        "not_applicable",
        "pre_transition",
        "exploration",
        "planning",
        "vocational_training",
        "home_based_project",
        "active_implementation",
        "employment_or_further_education",
        "follow_up",
      ],
      case_type: [
        "IEP",
        "transition",
        "behavior",
        "therapy",
        "vocational",
        "combined",
      ],
    },
  },
} as const
