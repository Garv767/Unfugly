-- Run this in your Supabase SQL Editor
ALTER TABLE user_logs
ADD COLUMN IF NOT EXISTS course_slot_map_json jsonb,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'extension',
ADD COLUMN IF NOT EXISTS academia_cookies jsonb;

