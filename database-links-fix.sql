-- ========================================
-- BeakyBabe - Fix Links RLS Policies
-- ========================================
-- Run this in Supabase SQL Editor to fix link creation

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their own links" ON links;
DROP POLICY IF EXISTS "Users can insert their own links" ON links;
DROP POLICY IF EXISTS "Users can update their own links" ON links;
DROP POLICY IF EXISTS "Users can delete their own links" ON links;
DROP POLICY IF EXISTS "Active links are viewable by everyone" ON links;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own links" ON links
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links" ON links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON links
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anyone to view active links (for public profiles)
CREATE POLICY "Anyone can view active links" ON links
    FOR SELECT USING (is_active = true);

-- Also ensure the user has a profile (required for foreign key)
-- Check if the current user has a profile, if not create one
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID from auth
    SELECT auth.uid() INTO current_user_id;
    
    -- If we have a user ID, ensure they have a profile
    IF current_user_id IS NOT NULL THEN
        INSERT INTO profiles (id, username, full_name)
        VALUES (
            current_user_id,
            'user_' || substring(current_user_id::text, 1, 8),
            'User'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON links TO authenticated;
GRANT SELECT ON links TO anon;
