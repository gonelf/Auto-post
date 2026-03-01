-- Reddit Auto-Post Database Schema
-- Run this in your Tacobase/Supabase SQL editor to set up the database.

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_user_id    text UNIQUE NOT NULL,   -- Reddit's t2_xxxxxxx account ID
  reddit_username   text NOT NULL,
  access_token      text NOT NULL,          -- AES-256-GCM encrypted
  refresh_token     text NOT NULL,          -- AES-256-GCM encrypted
  token_expires_at  timestamptz NOT NULL,
  avatar_url        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_reddit_user_id ON users (reddit_user_id);

-- ── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type           text NOT NULL CHECK (post_type IN ('text', 'link', 'image')),
  title               text NOT NULL,
  subreddit           text NOT NULL,
  body_text           text,
  link_url            text,
  image_url           text,
  image_storage_key   text,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('draft', 'scheduled', 'posting', 'posted', 'failed')),
  scheduled_at        timestamptz,
  posted_at           timestamptz,
  reddit_post_id      text,
  reddit_post_url     text,
  failure_reason      text,
  retry_count         integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Fast cron query: scheduled posts that are due
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_at
  ON posts (status, scheduled_at)
  WHERE status = 'scheduled';

-- Dashboard query: user's posts sorted by created_at
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at
  ON posts (user_id, created_at DESC);

-- ── OAuth States ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_states (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state         text UNIQUE NOT NULL,
  code_verifier text NOT NULL,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states (state);

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Create a storage bucket named 'post-images' with public read access in the
-- Tacobase/Supabase dashboard, or run:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
