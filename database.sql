-- ========================================
-- BeakyBabe Database Schema for Supabase
-- ========================================
-- Run this in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PROFILES TABLE
-- ========================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT,
    -- Appearance settings
    theme TEXT DEFAULT 'dark',
    primary_color TEXT DEFAULT '#a855f7',
    secondary_color TEXT DEFAULT '#ec4899',
    font_family TEXT DEFAULT 'Inter',
    button_style TEXT DEFAULT 'rounded',
    -- Plan info
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'creator_plus', 'enterprise')),
    plan_expires_at TIMESTAMPTZ,
    -- Settings
    email_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    show_analytics_public BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Public profiles (for viewing pages)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

-- ========================================
-- LINKS TABLE
-- ========================================
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT '🔗',
    -- Appearance
    bg_color TEXT,
    text_color TEXT,
    -- Scheduling
    is_active BOOLEAN DEFAULT true,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    -- Position for ordering
    position INTEGER NOT NULL DEFAULT 0,
    -- Stats cache
    total_clicks INTEGER DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Policies for links
CREATE POLICY "Users can view their own links" ON links
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links" ON links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" ON links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" ON links
    FOR DELETE USING (auth.uid() = user_id);

-- Public links (for viewing pages)
CREATE POLICY "Active links are viewable by everyone" ON links
    FOR SELECT USING (is_active = true);

-- ========================================
-- PAGE VIEWS TABLE (Analytics)
-- ========================================
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Visitor info
    visitor_ip TEXT,
    visitor_country TEXT,
    visitor_city TEXT,
    visitor_device TEXT, -- mobile, tablet, desktop
    visitor_browser TEXT,
    visitor_os TEXT,
    -- Referrer info
    referrer TEXT,
    referrer_source TEXT, -- instagram, tiktok, twitter, youtube, direct, other
    -- Timestamps
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Policies for page_views
CREATE POLICY "Users can view their own page views" ON page_views
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert page views" ON page_views
    FOR INSERT WITH CHECK (true);

-- ========================================
-- LINK CLICKS TABLE (Analytics)
-- ========================================
CREATE TABLE link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Visitor info
    visitor_ip TEXT,
    visitor_country TEXT,
    visitor_device TEXT,
    -- Referrer
    referrer_source TEXT,
    -- Timestamps
    clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for link_clicks
CREATE POLICY "Users can view their own link clicks" ON link_clicks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert link clicks" ON link_clicks
    FOR INSERT WITH CHECK (true);

-- ========================================
-- PRODUCTS TABLE (Store)
-- ========================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    -- Product type
    type TEXT DEFAULT 'digital' CHECK (type IN ('digital', 'tip', 'membership')),
    -- For digital products
    file_url TEXT,
    file_name TEXT,
    -- For tips
    is_custom_amount BOOLEAN DEFAULT false,
    suggested_amounts JSONB, -- [5, 10, 25, 50]
    -- For memberships
    membership_interval TEXT CHECK (membership_interval IN ('monthly', 'yearly')),
    -- Appearance
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    -- Stats
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Users can view their own products" ON products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

-- Public products
CREATE POLICY "Active products are viewable by everyone" ON products
    FOR SELECT USING (is_active = true);

-- ========================================
-- ORDERS TABLE (Store)
-- ========================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Buyer info
    buyer_email TEXT NOT NULL,
    buyer_name TEXT,
    -- Payment
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_provider TEXT, -- stripe, paypal
    payment_id TEXT, -- External payment ID
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = seller_id);

-- ========================================
-- EMAIL SUBSCRIBERS TABLE
-- ========================================
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    -- Unique email per creator
    UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Policies for subscribers
CREATE POLICY "Users can view their own subscribers" ON subscribers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can subscribe" ON subscribers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own subscribers" ON subscribers
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', ''))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update link click count
CREATE OR REPLACE FUNCTION increment_link_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE links SET total_clicks = total_clicks + 1 WHERE id = NEW.link_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for link clicks
CREATE TRIGGER on_link_click
    AFTER INSERT ON link_clicks
    FOR EACH ROW EXECUTE FUNCTION increment_link_clicks();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_position ON links(user_id, position);
CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_viewed_at ON page_views(viewed_at);
CREATE INDEX idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- ========================================
-- VIEWS FOR ANALYTICS
-- ========================================

-- Daily stats view
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    user_id,
    DATE(viewed_at) as date,
    COUNT(*) as views
FROM page_views
GROUP BY user_id, DATE(viewed_at);

-- Traffic sources view
CREATE OR REPLACE VIEW traffic_sources AS
SELECT 
    user_id,
    COALESCE(referrer_source, 'direct') as source,
    COUNT(*) as count
FROM page_views
GROUP BY user_id, referrer_source;

-- ========================================
-- SOCIAL CONNECTIONS TABLE
-- ========================================
CREATE TABLE social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'twitter', 'spotify')),
    -- OAuth tokens (encrypted in production)
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    -- Profile data from platform
    profile_data JSONB,
    platform_user_id TEXT,
    platform_username TEXT,
    -- Settings
    auto_sync BOOLEAN DEFAULT true,
    sync_interval_hours INTEGER DEFAULT 24,
    last_synced_at TIMESTAMPTZ,
    -- Timestamps
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique platform per user
    UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Policies for social_connections
CREATE POLICY "Users can view their own social connections" ON social_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social connections" ON social_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social connections" ON social_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social connections" ON social_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Index for social connections
CREATE INDEX idx_social_connections_user_id ON social_connections(user_id);

-- ========================================
-- ADD STRIPE FIELDS TO PROFILES
-- ========================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN DEFAULT false;

-- ========================================
-- ADD SOURCE FIELD TO LINKS (for synced content)
-- ========================================
ALTER TABLE links ADD COLUMN IF NOT EXISTS source TEXT; -- 'manual', 'tiktok', 'youtube', 'instagram'
ALTER TABLE links ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- ========================================
-- FUNCTION TO INCREMENT PRODUCT SALES
-- ========================================
CREATE OR REPLACE FUNCTION increment_product_sales(product_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET 
        total_sales = total_sales + 1,
        total_revenue = total_revenue + amount
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SCHEDULED JOBS TRACKING (for cron jobs)
-- ========================================
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    result JSONB
);

-- Enable RLS
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role only" ON scheduled_jobs
    FOR ALL USING (false);
