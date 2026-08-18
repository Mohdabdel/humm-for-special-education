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
      data_point: {
        Row: {
          case_id: string
          created_at: string
          data_point_id: string
          denominator: number | null
          goal_id: string
          learner_id: string
          measurement_definition_id: string
          numerator: number | null
          observation_id: string
          outcome_code: Database["public"]["Enums"]["data_point_outcome_code"]
          recorded_at: string
          recorded_by_team_member_id: string
          source_mode: Database["public"]["Enums"]["data_point_source_mode"]
          unit: Database["public"]["Enums"]["data_point_unit"]
          validation_status: Database["public"]["Enums"]["data_point_validation_status"]
          value_numeric: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          data_point_id?: string
          denominator?: number | null
          goal_id: string
          learner_id: string
          measurement_definition_id: string
          numerator?: number | null
          observation_id: string
          outcome_code: Database["public"]["Enums"]["data_point_outcome_code"]
          recorded_at: string
          recorded_by_team_member_id: string
          source_mode?: Database["public"]["Enums"]["data_point_source_mode"]
          unit: Database["public"]["Enums"]["data_point_unit"]
          validation_status?: Database["public"]["Enums"]["data_point_validation_status"]
          value_numeric?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          data_point_id?: string
          denominator?: number | null
          goal_id?: string
          learner_id?: string
          measurement_definition_id?: string
          numerator?: number | null
          observation_id?: string
          outcome_code?: Database["public"]["Enums"]["data_point_outcome_code"]
          recorded_at?: string
          recorded_by_team_member_id?: string
          source_mode?: Database["public"]["Enums"]["data_point_source_mode"]
          unit?: Database["public"]["Enums"]["data_point_unit"]
          validation_status?: Database["public"]["Enums"]["data_point_validation_status"]
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "data_point_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "data_point_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "data_point_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
          {
            foreignKeyName: "data_point_measurement_definition_id_fk"
            columns: ["measurement_definition_id"]
            isOneToOne: false
            referencedRelation: "measurement_definition"
            referencedColumns: ["measurement_definition_id"]
          },
          {
            foreignKeyName: "data_point_observation_id_fk"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "observation"
            referencedColumns: ["observation_id"]
          },
          {
            foreignKeyName: "data_point_recorded_by_team_member_id_fk"
            columns: ["recorded_by_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      goal: {
        Row: {
          allowed_supports: string | null
          approved_at: string | null
          approved_by_team_member_id: string | null
          baseline_summary: string
          case_id: string
          conditions: string | null
          created_at: string
          criterion: string
          domain_id: string | null
          functional_context: string | null
          goal_id: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          goal_version_id: string | null
          human_approval_status: Database["public"]["Enums"]["goal_human_approval_status"]
          learner_id: string
          observable_behavior: string
          owner_team_member_id: string
          review_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          timeframe: string
          title: string
          updated_at: string
        }
        Insert: {
          allowed_supports?: string | null
          approved_at?: string | null
          approved_by_team_member_id?: string | null
          baseline_summary: string
          case_id: string
          conditions?: string | null
          created_at?: string
          criterion: string
          domain_id?: string | null
          functional_context?: string | null
          goal_id?: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          goal_version_id?: string | null
          human_approval_status?: Database["public"]["Enums"]["goal_human_approval_status"]
          learner_id: string
          observable_behavior: string
          owner_team_member_id: string
          review_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          timeframe: string
          title: string
          updated_at?: string
        }
        Update: {
          allowed_supports?: string | null
          approved_at?: string | null
          approved_by_team_member_id?: string | null
          baseline_summary?: string
          case_id?: string
          conditions?: string | null
          created_at?: string
          criterion?: string
          domain_id?: string | null
          functional_context?: string | null
          goal_id?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          goal_version_id?: string | null
          human_approval_status?: Database["public"]["Enums"]["goal_human_approval_status"]
          learner_id?: string
          observable_behavior?: string
          owner_team_member_id?: string
          review_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          timeframe?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_approved_by_team_member_id_team_member_team_member_id_fk"
            columns: ["approved_by_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "goal_case_id_case_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "goal_learner_id_learner_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
          {
            foreignKeyName: "goal_owner_team_member_id_team_member_team_member_id_fk"
            columns: ["owner_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
        ]
      }
      goal_need_link: {
        Row: {
          created_at: string
          goal_id: string
          goal_need_link_id: string
          need_id: string
          primary_link: boolean
          rationale: string
          relationship_type: Database["public"]["Enums"]["goal_need_relationship_type"]
        }
        Insert: {
          created_at?: string
          goal_id: string
          goal_need_link_id?: string
          need_id: string
          primary_link?: boolean
          rationale: string
          relationship_type: Database["public"]["Enums"]["goal_need_relationship_type"]
        }
        Update: {
          created_at?: string
          goal_id?: string
          goal_need_link_id?: string
          need_id?: string
          primary_link?: boolean
          rationale?: string
          relationship_type?: Database["public"]["Enums"]["goal_need_relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "goal_need_link_goal_id_goal_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_need_link_need_id_need_need_id_fk"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "need"
            referencedColumns: ["need_id"]
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
      measurement_definition: {
        Row: {
          code: string
          collection_cadence: string
          created_at: string
          denominator_label: string | null
          goal_id: string
          label_ar: string
          measurement_definition_id: string
          measurement_plan_id: string
          measurement_type: Database["public"]["Enums"]["measurement_definition_type"]
          numerator_label: string | null
          status: Database["public"]["Enums"]["measurement_definition_status"]
          support_tracking_required: boolean
          target_criterion: string
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          collection_cadence: string
          created_at?: string
          denominator_label?: string | null
          goal_id: string
          label_ar: string
          measurement_definition_id?: string
          measurement_plan_id: string
          measurement_type: Database["public"]["Enums"]["measurement_definition_type"]
          numerator_label?: string | null
          status?: Database["public"]["Enums"]["measurement_definition_status"]
          support_tracking_required?: boolean
          target_criterion: string
          unit: string
          updated_at?: string
        }
        Update: {
          code?: string
          collection_cadence?: string
          created_at?: string
          denominator_label?: string | null
          goal_id?: string
          label_ar?: string
          measurement_definition_id?: string
          measurement_plan_id?: string
          measurement_type?: Database["public"]["Enums"]["measurement_definition_type"]
          numerator_label?: string | null
          status?: Database["public"]["Enums"]["measurement_definition_status"]
          support_tracking_required?: boolean
          target_criterion?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_definition_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "measurement_definition_measurement_plan_id_fk"
            columns: ["measurement_plan_id"]
            isOneToOne: false
            referencedRelation: "measurement_plan"
            referencedColumns: ["measurement_plan_id"]
          },
        ]
      }
      measurement_plan: {
        Row: {
          created_at: string
          goal_id: string
          measurement_plan_id: string
          measurement_type: string
          target_criterion: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          measurement_plan_id?: string
          measurement_type: string
          target_criterion: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          measurement_plan_id?: string
          measurement_type?: string
          target_criterion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_plan_goal_id_goal_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
        ]
      }
      need: {
        Row: {
          case_id: string
          created_at: string
          description: string
          domain_id: string | null
          functional_impact: string
          identified_at: string
          identified_by_team_member_id: string
          learner_id: string
          need_id: string
          need_type: Database["public"]["Enums"]["need_type"]
          priority_basis: Database["public"]["Enums"]["need_priority_basis"]
          priority_level: Database["public"]["Enums"]["need_priority_level"]
          review_due_date: string | null
          source_confidence: Database["public"]["Enums"]["need_source_confidence"]
          status: Database["public"]["Enums"]["need_status"]
          subdomain_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description: string
          domain_id?: string | null
          functional_impact: string
          identified_at?: string
          identified_by_team_member_id: string
          learner_id: string
          need_id?: string
          need_type: Database["public"]["Enums"]["need_type"]
          priority_basis: Database["public"]["Enums"]["need_priority_basis"]
          priority_level: Database["public"]["Enums"]["need_priority_level"]
          review_due_date?: string | null
          source_confidence?: Database["public"]["Enums"]["need_source_confidence"]
          status?: Database["public"]["Enums"]["need_status"]
          subdomain_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string
          domain_id?: string | null
          functional_impact?: string
          identified_at?: string
          identified_by_team_member_id?: string
          learner_id?: string
          need_id?: string
          need_type?: Database["public"]["Enums"]["need_type"]
          priority_basis?: Database["public"]["Enums"]["need_priority_basis"]
          priority_level?: Database["public"]["Enums"]["need_priority_level"]
          review_due_date?: string | null
          source_confidence?: Database["public"]["Enums"]["need_source_confidence"]
          status?: Database["public"]["Enums"]["need_status"]
          subdomain_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "need_case_id_case_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "need_identified_by_team_member_id_team_member_team_member_id_fk"
            columns: ["identified_by_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "need_learner_id_learner_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
        ]
      }
      observation: {
        Row: {
          case_id: string
          created_at: string
          goal_id: string | null
          learner_id: string
          narrative_text: string | null
          observation_id: string
          observation_type: Database["public"]["Enums"]["observation_type"]
          observed_at: string
          observer_team_member_id: string
          purpose: Database["public"]["Enums"]["observation_purpose"]
          session_id: string | null
          status: Database["public"]["Enums"]["observation_status"]
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          goal_id?: string | null
          learner_id: string
          narrative_text?: string | null
          observation_id?: string
          observation_type: Database["public"]["Enums"]["observation_type"]
          observed_at?: string
          observer_team_member_id: string
          purpose: Database["public"]["Enums"]["observation_purpose"]
          session_id?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          goal_id?: string | null
          learner_id?: string
          narrative_text?: string | null
          observation_id?: string
          observation_type?: Database["public"]["Enums"]["observation_type"]
          observed_at?: string
          observer_team_member_id?: string
          purpose?: Database["public"]["Enums"]["observation_purpose"]
          session_id?: string | null
          status?: Database["public"]["Enums"]["observation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_case_id_case_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "observation_goal_id_goal_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "observation_learner_id_learner_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
          {
            foreignKeyName: "observation_observer_team_member_id_team_member_team_member_id_"
            columns: ["observer_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "observation_session_id_session_session_id_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session"
            referencedColumns: ["session_id"]
          },
        ]
      }
      session: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          brief_note: string | null
          case_id: string
          completion_status:
            | Database["public"]["Enums"]["session_completion_status"]
            | null
          created_at: string
          delivered_by_team_member_id: string
          goal_id: string | null
          learner_id: string
          plan_id: string | null
          scheduled_end_at: string | null
          scheduled_start_at: string | null
          session_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          brief_note?: string | null
          case_id: string
          completion_status?:
            | Database["public"]["Enums"]["session_completion_status"]
            | null
          created_at?: string
          delivered_by_team_member_id: string
          goal_id?: string | null
          learner_id: string
          plan_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          session_id?: string
          session_type: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          brief_note?: string | null
          case_id?: string
          completion_status?:
            | Database["public"]["Enums"]["session_completion_status"]
            | null
          created_at?: string
          delivered_by_team_member_id?: string
          goal_id?: string | null
          learner_id?: string
          plan_id?: string | null
          scheduled_end_at?: string | null
          scheduled_start_at?: string | null
          session_id?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_case_id_case_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "session_delivered_by_team_member_id_team_member_team_member_id_"
            columns: ["delivered_by_team_member_id"]
            isOneToOne: false
            referencedRelation: "team_member"
            referencedColumns: ["team_member_id"]
          },
          {
            foreignKeyName: "session_goal_id_goal_goal_id_fk"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "session_learner_id_learner_learner_id_fk"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learner"
            referencedColumns: ["learner_id"]
          },
        ]
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
      has_case_access: { Args: { _case_id: string }; Returns: boolean }
      has_goal_case_access: { Args: { _goal_id: string }; Returns: boolean }
      is_own_team_member: {
        Args: { _team_member_id: string }
        Returns: boolean
      }
      shares_active_case_with_current_user: {
        Args: { _team_member_id: string }
        Returns: boolean
      }
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
      data_point_outcome_code:
        | "success"
        | "partial"
        | "unsuccessful"
        | "not_applicable"
      data_point_source_mode:
        | "manual"
        | "imported"
        | "device_assisted"
        | "AI_suggested"
      data_point_unit:
        | "percent"
        | "count"
        | "duration_seconds"
        | "duration_minutes"
        | "latency_seconds"
        | "rate"
        | "rubric_score"
        | "prompt_level"
        | "productivity_rate"
      data_point_validation_status:
        | "draft"
        | "validated"
        | "corrected"
        | "rejected"
      goal_human_approval_status:
        | "pending"
        | "approved"
        | "approved_with_conditions"
        | "rejected"
      goal_need_relationship_type:
        | "directly_addresses"
        | "partially_addresses"
        | "supports"
      goal_status:
        | "draft"
        | "in_review"
        | "approved"
        | "active"
        | "paused"
        | "generalization_pending"
        | "generalized"
        | "revised"
        | "closed"
        | "archived"
      goal_type:
        | "academic"
        | "communication"
        | "behavior"
        | "functional"
        | "adaptive"
        | "vocational"
        | "transition"
        | "therapy"
        | "self_determination"
      measurement_definition_status: "draft" | "active"
      measurement_definition_type:
        | "accuracy"
        | "frequency"
        | "duration"
        | "latency"
        | "task_analysis"
        | "prompt_level"
        | "productivity"
        | "quality"
        | "self_correction"
        | "generalization"
      need_priority_basis:
        | "assessment"
        | "learner_priority"
        | "family_priority"
        | "team_decision"
        | "transition_requirement"
        | "safety"
      need_priority_level: "low" | "medium" | "high" | "critical"
      need_source_confidence: "low" | "medium" | "high"
      need_status:
        | "draft"
        | "active"
        | "addressed_by_goal"
        | "addressed_by_support"
        | "monitor"
        | "deferred"
        | "resolved"
        | "archived"
      need_type:
        | "skill_gap"
        | "access_barrier"
        | "environmental_barrier"
        | "communication"
        | "behavior"
        | "functional"
        | "vocational"
        | "transition"
        | "safety"
        | "assessment_gap"
      observation_purpose:
        | "baseline"
        | "progress"
        | "incident"
        | "generalization"
        | "quality_check"
        | "follow_up"
      observation_status: "draft" | "reviewed" | "approved" | "superseded"
      observation_type:
        | "structured"
        | "narrative"
        | "ABC"
        | "functional"
        | "classroom"
        | "family_report"
        | "learner_report"
        | "task_performance"
      session_completion_status: "complete" | "partial" | "not_completed"
      session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
        | "documented"
      session_type:
        | "special_education"
        | "therapy"
        | "behavior_support"
        | "vocational_training"
        | "functional_activity"
        | "classroom_support"
        | "community_based"
        | "family_coaching"
        | "meeting"
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
      data_point_outcome_code: [
        "success",
        "partial",
        "unsuccessful",
        "not_applicable",
      ],
      data_point_source_mode: [
        "manual",
        "imported",
        "device_assisted",
        "AI_suggested",
      ],
      data_point_unit: [
        "percent",
        "count",
        "duration_seconds",
        "duration_minutes",
        "latency_seconds",
        "rate",
        "rubric_score",
        "prompt_level",
        "productivity_rate",
      ],
      data_point_validation_status: [
        "draft",
        "validated",
        "corrected",
        "rejected",
      ],
      goal_human_approval_status: [
        "pending",
        "approved",
        "approved_with_conditions",
        "rejected",
      ],
      goal_need_relationship_type: [
        "directly_addresses",
        "partially_addresses",
        "supports",
      ],
      goal_status: [
        "draft",
        "in_review",
        "approved",
        "active",
        "paused",
        "generalization_pending",
        "generalized",
        "revised",
        "closed",
        "archived",
      ],
      goal_type: [
        "academic",
        "communication",
        "behavior",
        "functional",
        "adaptive",
        "vocational",
        "transition",
        "therapy",
        "self_determination",
      ],
      measurement_definition_status: ["draft", "active"],
      measurement_definition_type: [
        "accuracy",
        "frequency",
        "duration",
        "latency",
        "task_analysis",
        "prompt_level",
        "productivity",
        "quality",
        "self_correction",
        "generalization",
      ],
      need_priority_basis: [
        "assessment",
        "learner_priority",
        "family_priority",
        "team_decision",
        "transition_requirement",
        "safety",
      ],
      need_priority_level: ["low", "medium", "high", "critical"],
      need_source_confidence: ["low", "medium", "high"],
      need_status: [
        "draft",
        "active",
        "addressed_by_goal",
        "addressed_by_support",
        "monitor",
        "deferred",
        "resolved",
        "archived",
      ],
      need_type: [
        "skill_gap",
        "access_barrier",
        "environmental_barrier",
        "communication",
        "behavior",
        "functional",
        "vocational",
        "transition",
        "safety",
        "assessment_gap",
      ],
      observation_purpose: [
        "baseline",
        "progress",
        "incident",
        "generalization",
        "quality_check",
        "follow_up",
      ],
      observation_status: ["draft", "reviewed", "approved", "superseded"],
      observation_type: [
        "structured",
        "narrative",
        "ABC",
        "functional",
        "classroom",
        "family_report",
        "learner_report",
        "task_performance",
      ],
      session_completion_status: ["complete", "partial", "not_completed"],
      session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
        "documented",
      ],
      session_type: [
        "special_education",
        "therapy",
        "behavior_support",
        "vocational_training",
        "functional_activity",
        "classroom_support",
        "community_based",
        "family_coaching",
        "meeting",
      ],
    },
  },
} as const
