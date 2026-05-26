export type Platform = "Facebook" | "Discord" | "LINE";
export type PostStatus = "pending" | "approved" | "removed";
export type MemberRole = "member" | "moderator";

export interface Community {
  id: string;
  admin_id: string;
  name: string;
  platform: string;
  member_count: number;
  group_url: string | null;
  webhook_url: string;
  onboarded: boolean;
  description: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
}

export interface Member {
  id: string;
  community_id: string;
  nickname: string;
  persona_tag: string | null;
  role: MemberRole;
  engagement_score: number;
  created_at: string;
}

export interface FlaggedPost {
  id: string;
  community_id: string;
  author: string;
  content: string;
  platform: string;
  score: number;
  category: string | null;
  status: string;
  created_at: string;
}

export interface MatchRequest {
  id: string;
  community_id: string;
  raw_text: string;
  game: string | null;
  role: string | null;
  time_window: string | null;
  parse_confidence: number | null;
  status: string;
  created_at: string;
}

export interface TeamPlayer {
  nick: string;
  style: string;
}

export interface Team {
  id: string;
  community_id: string;
  game: string;
  scheduled_time: string | null;
  players: TeamPlayer[];
  outcome: string | null;
  created_at: string;
}

export interface ActivityFeed {
  id: string;
  community_id: string;
  type: string;
  message: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  game_roles: string[];
  created_at: string;
  updated_at: string;
}

// Webhook payload shapes per platform
export interface DiscordWebhookPayload {
  author?: { name?: string };
  content?: string;
}

export interface FacebookWebhookPayload {
  entry?: Array<{
    messaging?: Array<{
      sender?: { id?: string };
      message?: { text?: string };
    }>;
  }>;
}

export interface LineWebhookPayload {
  events?: Array<{
    source?: { userId?: string };
    message?: { text?: string };
  }>;
}
