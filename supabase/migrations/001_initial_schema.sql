-- House of Mourning - Initial MVP Schema
-- Created: 2025-11-13
-- Phase 1: Simple grief message storage with anonymous submission

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages table - core grief expressions
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core content
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  
  -- Moderation
  approved BOOLEAN DEFAULT true,  -- Public immediately for MVP
  flagged BOOLEAN DEFAULT false,
  moderator_notes TEXT,
  
  -- Anonymous tracking (for rate limiting)
  session_id TEXT,  -- Client-generated UUID
  ip_hash TEXT,     -- SHA-256 hash of IP (not raw IP)
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete
  
  -- Future-proofing for Phase 3 (Constellation Networks)
  semantic_tags JSONB DEFAULT NULL
);

-- Indexes for performance
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_session ON messages(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_messages_approved ON messages(approved) WHERE approved = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read non-deleted, approved messages
CREATE POLICY "public_read_approved" ON messages
  FOR SELECT
  USING (approved = true AND deleted_at IS NULL);

-- Policy 2: Anyone can insert with session_id
CREATE POLICY "public_insert" ON messages
  FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL 
    AND char_length(content) BETWEEN 1 AND 280
  );

-- Policy 3: Service role can do anything (for admin/moderation)
CREATE POLICY "service_role_all" ON messages
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE messages IS 'Grief messages submitted by gallery visitors - MVP Phase 1';
COMMENT ON COLUMN messages.content IS 'Text content of grief message (1-280 characters)';
COMMENT ON COLUMN messages.approved IS 'Whether message is publicly visible (true by default for MVP)';
COMMENT ON COLUMN messages.flagged IS 'Marked by moderator for review';
COMMENT ON COLUMN messages.session_id IS 'Client-generated UUID for rate limiting';
COMMENT ON COLUMN messages.ip_hash IS 'SHA-256 hash of IP address for abuse prevention';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete timestamp (NULL = active)';
COMMENT ON COLUMN messages.semantic_tags IS 'Reserved for Phase 3 constellation network similarity detection';
