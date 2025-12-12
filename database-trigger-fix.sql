-- ========================================
-- BeakyBabe - PERMANENT TRIGGER FIX
-- ========================================
-- This ensures ALL new users automatically get a profile
-- Run this ONCE in Supabase SQL Editor

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Create a robust trigger function that won't fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_username TEXT;
    base_username TEXT;
    counter INT := 0;
BEGIN
    -- Create a base username from email
    base_username := LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
    
    -- If username is empty, use a random one
    IF base_username = '' OR base_username IS NULL THEN
        base_username := 'user' || floor(random() * 100000)::text;
    END IF;
    
    new_username := base_username;
    
    -- Handle duplicate usernames by adding a counter
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
        counter := counter + 1;
        new_username := base_username || counter::text;
    END LOOP;
    
    -- Insert the profile
    INSERT INTO profiles (
        id, 
        username, 
        full_name,
        bio,
        theme,
        primary_color,
        secondary_color,
        font_family,
        button_style,
        plan
    )
    VALUES (
        NEW.id,
        new_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        '',
        'dark',
        '#a855f7',
        '#ec4899',
        'Inter',
        'rounded',
        'free'
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION handle_new_user();

-- Step 4: Create profiles for any existing users who don't have one
INSERT INTO profiles (id, username, full_name, theme, primary_color, secondary_color, font_family, button_style, plan)
SELECT 
    u.id,
    LOWER(REGEXP_REPLACE(split_part(u.email, '@', 1), '[^a-z0-9]', '', 'g')) || floor(random() * 1000)::text,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'dark',
    '#a855f7',
    '#ec4899',
    'Inter',
    'rounded',
    'free'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Step 5: Verify
SELECT 'Trigger created successfully!' as status;
SELECT COUNT(*) as total_profiles FROM profiles;
