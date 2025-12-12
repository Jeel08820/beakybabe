-- ========================================
-- BeakyBabe - Database Fix
-- ========================================
-- Run this in Supabase SQL Editor to fix the user creation trigger

-- First, drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT,
    theme TEXT DEFAULT 'dark',
    primary_color TEXT DEFAULT '#a855f7',
    secondary_color TEXT DEFAULT '#ec4899',
    font_family TEXT DEFAULT 'Inter',
    button_style TEXT DEFAULT 'rounded',
    plan TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    email_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    show_analytics_public BOOLEAN DEFAULT false,
    stripe_account_id TEXT,
    stripe_customer_id TEXT,
    payouts_enabled BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- Create a SIMPLE trigger function that won't fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_username TEXT;
BEGIN
    -- Create a simple username from email
    new_username := LOWER(REPLACE(split_part(NEW.email, '@', 1), '.', ''));
    
    -- Handle duplicate usernames by adding random suffix
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
        new_username := new_username || floor(random() * 1000)::text;
    END LOOP;
    
    -- Insert profile
    INSERT INTO profiles (id, full_name, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        new_username
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
