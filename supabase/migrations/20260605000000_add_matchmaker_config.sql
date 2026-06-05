-- Add matchmaker_config column to communities
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS matchmaker_config jsonb NOT NULL DEFAULT '{"time_window": 60}';
