export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      communities: {
        Row: {
          id: string;
          name: string;
          platform: string;
          platform_group_id: string;
          admin_user_id: string | null;
          admin_auth_id: string | null;
          subscription_tier: string;
          total_members: number;
          last_synced_at: string | null;
          created_at: string;
          is_active: boolean;
          is_onboarded: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          platform: string;
          platform_group_id: string;
          admin_user_id?: string | null;
          admin_auth_id?: string | null;
          subscription_tier?: string;
          total_members?: number;
          last_synced_at?: string | null;
          created_at?: string;
          is_active?: boolean;
          is_onboarded?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          platform?: string;
          platform_group_id?: string;
          admin_user_id?: string | null;
          admin_auth_id?: string | null;
          subscription_tier?: string;
          total_members?: number;
          last_synced_at?: string | null;
          created_at?: string;
          is_active?: boolean;
          is_onboarded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "communities_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          display_name: string;
          platform_user_id: string;
          platform_type: string;
          warning_count: number;
          status: string;
          onboarding_completed: boolean;
          created_at: string;
          last_active_at: string | null;
        };
        Insert: {
          id?: string;
          display_name: string;
          platform_user_id: string;
          platform_type: string;
          warning_count?: number;
          status?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          display_name?: string;
          platform_user_id?: string;
          platform_type?: string;
          warning_count?: number;
          status?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          last_active_at?: string | null;
        };
        Relationships: [];
      };
      community_members: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          role: string;
          joined_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_cards: {
        Row: {
          id: string;
          user_id: string;
          community_id: string | null;
          game: string;
          role: string;
          available_time: Json;
          time_vector: Json | null;
          play_style: string;
          style_vector: Json | null;
          goal: string;
          rank: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          community_id?: string | null;
          game: string;
          role: string;
          available_time: Json;
          time_vector?: Json | null;
          play_style: string;
          style_vector?: Json | null;
          goal: string;
          rank?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          community_id?: string | null;
          game?: string;
          role?: string;
          available_time?: Json;
          time_vector?: Json | null;
          play_style?: string;
          style_vector?: Json | null;
          goal?: string;
          rank?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skill_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skill_cards_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          platform_post_id: string | null;
          content_type: string;
          content_preview: string | null;
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          platform_post_id?: string | null;
          content_type: string;
          content_preview?: string | null;
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          platform_post_id?: string | null;
          content_type?: string;
          content_preview?: string | null;
          is_blocked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_logs: {
        Row: {
          id: string;
          community_id: string;
          post_id: string;
          user_id: string;
          label: string;
          confidence_score: number;
          model_version: string;
          action_taken: string;
          threshold_used: number;
          requires_review: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          post_id: string;
          user_id: string;
          label: string;
          confidence_score: number;
          model_version: string;
          action_taken: string;
          threshold_used: number;
          requires_review?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          post_id?: string;
          user_id?: string;
          label?: string;
          confidence_score?: number;
          model_version?: string;
          action_taken?: string;
          threshold_used?: number;
          requires_review?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_logs_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_logs_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      human_reviews: {
        Row: {
          id: string;
          moderation_log_id: string;
          reviewer_id: string | null;
          decision: string | null;
          note: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          moderation_log_id: string;
          reviewer_id?: string | null;
          decision?: string | null;
          note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          moderation_log_id?: string;
          reviewer_id?: string | null;
          decision?: string | null;
          note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "human_reviews_moderation_log_id_fkey";
            columns: ["moderation_log_id"];
            isOneToOne: true;
            referencedRelation: "moderation_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "human_reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          community_id: string;
          requester_id: string;
          matched_user_id: string;
          game: string;
          match_score: number;
          game_score: number;
          time_score: number;
          role_score: number;
          style_score: number;
          status: string;
          requested_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          community_id: string;
          requester_id: string;
          matched_user_id: string;
          game: string;
          match_score: number;
          game_score: number;
          time_score: number;
          role_score: number;
          style_score: number;
          status?: string;
          requested_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          community_id?: string;
          requester_id?: string;
          matched_user_id?: string;
          game?: string;
          match_score?: number;
          game_score?: number;
          time_score?: number;
          role_score?: number;
          style_score?: number;
          status?: string;
          requested_at?: string;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_matched_user_id_fkey";
            columns: ["matched_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      match_ratings: {
        Row: {
          id: string;
          match_id: string;
          rater_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          rater_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          rater_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_ratings_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_ratings_rater_id_fkey";
            columns: ["rater_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_community_admin: { Args: { _community_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
