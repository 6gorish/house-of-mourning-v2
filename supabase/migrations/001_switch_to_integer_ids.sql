-- Migration: Switch messages table from UUID to BIGINT IDs
-- Date: 2025-11-14
-- Purpose: Fix dual-cursor pagination to work with integer IDs

-- Step 1: Drop existing table (if you want to preserve data, export first)
DROP TABLE IF EXISTS messages CASCADE;

-- Step 2: Create new table with BIGINT auto-incrementing ID
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,  -- Auto-incrementing 64-bit integer
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Step 3: Create indexes for query performance
-- Composite index for main queries (approved messages ordered by creation)
CREATE INDEX idx_messages_approved_timeline 
  ON messages(approved, deleted_at, created_at DESC, id DESC)
  WHERE approved = true AND deleted_at IS NULL;

-- Index for cursor pagination (historical traversal)
CREATE INDEX idx_messages_cursor_desc 
  ON messages(id DESC)
  WHERE approved = true AND deleted_at IS NULL;

-- Index for new message polling
CREATE INDEX idx_messages_cursor_asc 
  ON messages(id ASC)
  WHERE approved = true AND deleted_at IS NULL;

-- Step 4: Add helpful comments
COMMENT ON TABLE messages IS 'Grief messages for The House of Mourning exhibition';
COMMENT ON COLUMN messages.id IS 'Auto-incrementing integer ID for cursor pagination';
COMMENT ON COLUMN messages.content IS 'The grief message content (max 280 chars enforced at app level)';
COMMENT ON COLUMN messages.created_at IS 'Timestamp when message was submitted';
COMMENT ON COLUMN messages.approved IS 'Whether message has been approved for display';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete timestamp (NULL = not deleted)';

-- Step 5: Grant permissions (adjust role name if needed)
-- Supabase typically uses 'anon' and 'authenticated' roles
GRANT SELECT ON messages TO anon;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO authenticated;

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved, non-deleted messages
CREATE POLICY "Public can view approved messages"
  ON messages
  FOR SELECT
  USING (approved = true AND deleted_at IS NULL);

-- Policy: Authenticated users can insert messages (will need approval)
CREATE POLICY "Authenticated users can insert messages"
  ON messages
  FOR INSERT
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Messages table now uses BIGINT IDs.';
  RAISE NOTICE 'Next step: Re-run seed data script to populate with 600 messages.';
END $$;
