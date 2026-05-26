export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_feed: {
        Row: {
          community_id: string;
          created_at: string;
          id: string;
          message: string;
          type: string;
        };
        Insert: {
          community_id: string;
          created_at?: string;
          id?: string;
          message: string;
          type: string;
        };
        Update: {
          community_id?: string;
          created_at?: string;
          id?: string;
          message?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_feed_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      communities: {
        Row: {
          admin_id: string;
          created_at: string;
          description: string | null;
          group_url: string | null;
          id: string;
          member_count: number;
          name: string;
          onboarded: boolean;
          platform: string;
          settings: Json;
          webhook_url: string;
        };
        Insert: {
          admin_id: string;
          created_at?: string;
          description?: string | null;
          group_url?: string | null;
          id?: string;
          member_count?: number;
          name: string;
          onboarded?: boolean;
          platform: string;
          settings?: Json;
          webhook_url?: string;
        };
        Update: {
          admin_id?: string;
          created_at?: string;
          description?: string | null;
          group_url?: string | null;
          id?: string;
          member_count?: number;
          name?: string;
          onboarded?: boolean;
          platform?: string;
          settings?: Json;
          webhook_url?: string;
        };
        Relationships: [];
      };
      flagged_posts: {
        Row: {
          author: string;
          category: string | null;
          community_id: string;
          content: string;
          created_at: string;
          id: string;
          platform: string;
          score: number;
          status: string;
        };
        Insert: {
          author: string;
          category?: string | null;
          community_id: string;
          content: string;
          created_at?: string;
          id?: string;
          platform: string;
          score?: number;
          status?: string;
        };
        Update: {
          author?: string;
          category?: string | null;
          community_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          platform?: string;
          score?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flagged_posts_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          admin_name: string;
          contact: string;
          created_at: string;
          group_name: string;
          id: string;
          member_count: string | null;
          platform: string;
        };
        Insert: {
          admin_name: string;
          contact: string;
          created_at?: string;
          group_name: string;
          id?: string;
          member_count?: string | null;
          platform: string;
        };
        Update: {
          admin_name?: string;
          contact?: string;
          created_at?: string;
          group_name?: string;
          id?: string;
          member_count?: string | null;
          platform?: string;
        };
        Relationships: [];
      };
      match_requests: {
        Row: {
          community_id: string;
          created_at: string;
          game: string | null;
          id: string;
          parse_confidence: number | null;
          raw_text: string;
          role: string | null;
          status: string;
          time_window: string | null;
        };
        Insert: {
          community_id: string;
          created_at?: string;
          game?: string | null;
          id?: string;
          parse_confidence?: number | null;
          raw_text: string;
          role?: string | null;
          status?: string;
          time_window?: string | null;
        };
        Update: {
          community_id?: string;
          created_at?: string;
          game?: string | null;
          id?: string;
          parse_confidence?: number | null;
          raw_text?: string;
          role?: string | null;
          status?: string;
          time_window?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_requests_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          community_id: string;
          created_at: string;
          engagement_score: number;
          id: string;
          nickname: string;
          persona_tag: string | null;
          role: string;
        };
        Insert: {
          community_id: string;
          created_at?: string;
          engagement_score?: number;
          id?: string;
          nickname: string;
          persona_tag?: string | null;
          role?: string;
        };
        Update: {
          community_id?: string;
          created_at?: string;
          engagement_score?: number;
          id?: string;
          nickname?: string;
          persona_tag?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          community_id: string;
          created_at: string;
          game: string;
          id: string;
          outcome: string | null;
          players: Json;
          scheduled_time: string | null;
        };
        Insert: {
          community_id: string;
          created_at?: string;
          game: string;
          id?: string;
          outcome?: string | null;
          players?: Json;
          scheduled_time?: string | null;
        };
        Update: {
          community_id?: string;
          created_at?: string;
          game?: string;
          id?: string;
          outcome?: string | null;
          players?: Json;
          scheduled_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_community_id_fkey";
            columns: ["community_id"];
            isOneToOne: false;
            referencedRelation: "communities";
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
