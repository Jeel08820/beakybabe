-- ========================================
-- BeakyBabe - Create Missing Profile
-- ========================================
-- Run this in Supabase SQL Editor to create your profile

-- Insert profile for your user (the one that's missing)
INSERT INTO profiles (id, username, full_name, bio, theme, primary_color, secondary_color, font_family, button_style, plan)
VALUES (
    '28b78bae-bc8e-46c7-b447-0e9a866ea898',  -- Your user ID
    'user088572',                             -- Username (from email prefix)
    'User',                                   -- Full name
    'Welcome to my page!',                    -- Default bio
    'dark',                                   -- Default theme
    '#a855f7',                               -- Default primary color
    '#ec4899',                               -- Default secondary color
    'Inter',                                 -- Default font
    'rounded',                               -- Default button style
    'free'                                   -- Plan
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Verify the profile was created
SELECT * FROM profiles WHERE id = '28b78bae-bc8e-46c7-b447-0e9a866ea898';
