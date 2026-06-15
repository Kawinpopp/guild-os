export type Platform = "facebook" | "discord" | "line";
export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";
export type UserStatus = "active" | "warned" | "muted" | "banned";
export type MemberRole = "member" | "moderator" | "admin";
export type PlayStyle = "Aggressive" | "Teamwork" | "Competitive" | "Casual";
export type Goal = "rank_push" | "casual" | "tournament" | "find_team";
export type ContentType = "post" | "comment" | "reply";
export type ModerationLabel = "spam" | "toxic" | "sell_id" | "normal";
export type ModerationAction = "remove" | "warn" | "mute" | "pass";
export type MatchStatus = "pending" | "accepted" | "rejected" | "expired";
export type ReviewDecision = "confirm" | "override" | "ignore";

export interface Community {
  id: string;
  name: string;
  platform: Platform;
  platform_group_id: string;
  admin_user_id: string | null;
  subscription_tier: SubscriptionTier;
  total_members: number;
  last_synced_at: string | null;
  created_at: string;
  is_active: boolean;
}

export interface User {
  id: string;
  display_name: string;
  platform_user_id: string;
  platform_type: Platform;
  warning_count: number;
  status: UserStatus;
  onboarding_completed: boolean;
  created_at: string;
  last_active_at: string | null;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  is_active: boolean;
}

export interface SkillCard {
  id: string;
  user_id: string;
  community_id: string | null;
  game: string;
  role: string;
  available_time: string[];
  time_vector: number[] | null;
  play_style: PlayStyle;
  style_vector: number[] | null;
  goal: Goal;
  rank: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  user_id: string;
  platform_post_id: string | null;
  content_type: ContentType;
  content_preview: string | null;
  is_blocked: boolean;
  created_at: string;
}

export interface ModerationLog {
  id: string;
  community_id: string;
  post_id: string;
  user_id: string;
  label: ModerationLabel;
  confidence_score: number;
  model_version: string;
  action_taken: ModerationAction;
  threshold_used: number;
  requires_review: boolean;
  created_at: string;
}

export interface HumanReview {
  id: string;
  moderation_log_id: string;
  reviewer_id: string | null;
  decision: ReviewDecision | null;
  note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Match {
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
  status: MatchStatus;
  requested_at: string;
  responded_at: string | null;
}

export interface MatchRating {
  id: string;
  match_id: string;
  rater_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
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
