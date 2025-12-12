-- ========================================
-- BeakyBabe - Complete Database Setup
-- ========================================
-- Run this AFTER the fix script to create all remaining tables

-- ========================================
-- LINKS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT '🔗',
    bg_color TEXT,
    text_color TEXT,
    is_active BOOLEAN DEFAULT true,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    position INTEGER NOT NULL DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    source TEXT,
    thumbnail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own links" ON links;
DROP POLICY IF EXISTS "Users can insert their own links" ON links;
DROP POLICY IF EXISTS "Users can update their own links" ON links;
DROP POLICY IF EXISTS "Users can delete their own links" ON links;
DROP POLICY IF EXISTS "Active links are viewable by everyone" ON links;

CREATE POLICY "Users can view their own links" ON links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own links" ON links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own links" ON links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own links" ON links FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Active links are viewable by everyone" ON links FOR SELECT USING (is_active = true);

-- ========================================
-- PAGE VIEWS TABLE (Analytics)
-- ========================================
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    visitor_ip TEXT,
    visitor_country TEXT,
    visitor_city TEXT,
    visitor_device TEXT,
    visitor_browser TEXT,
    visitor_os TEXT,
    referrer TEXT,
    referrer_source TEXT,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own page views" ON page_views;
DROP POLICY IF EXISTS "Anyone can insert page views" ON page_views;

CREATE POLICY "Users can view their own page views" ON page_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert page views" ON page_views FOR INSERT WITH CHECK (true);

-- ========================================
-- LINK CLICKS TABLE (Analytics)
-- ========================================
CREATE TABLE IF NOT EXISTS link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    visitor_ip TEXT,
    visitor_country TEXT,
    visitor_device TEXT,
    referrer_source TEXT,
    clicked_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own link clicks" ON link_clicks;
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON link_clicks;

CREATE POLICY "Users can view their own link clicks" ON link_clicks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert link clicks" ON link_clicks FOR INSERT WITH CHECK (true);

-- ========================================
-- PRODUCTS TABLE (Store)
-- ========================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    type TEXT DEFAULT 'digital',
    file_url TEXT,
    file_name TEXT,
    is_custom_amount BOOLEAN DEFAULT false,
    suggested_amounts JSONB,
    membership_interval TEXT,
    image_url TEXT,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can insert their own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON products;

CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON products FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Active products are viewable by everyone" ON products FOR SELECT USING (is_active = true);

-- ========================================
-- ORDERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    buyer_email TEXT NOT NULL,
    buyer_name TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'pending',
    payment_provider TEXT,
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = seller_id);

-- ========================================
-- SUBSCRIBERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, email)
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscribers" ON subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON subscribers;
DROP POLICY IF EXISTS "Users can update their own subscribers" ON subscribers;

CREATE POLICY "Users can view their own subscribers" ON subscribers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can subscribe" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own subscribers" ON subscribers FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- SOCIAL CONNECTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    profile_data JSONB,
    platform_user_id TEXT,
    platform_username TEXT,
    auto_sync BOOLEAN DEFAULT true,
    sync_interval_hours INTEGER DEFAULT 24,
    last_synced_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own social connections" ON social_connections;
DROP POLICY IF EXISTS "Users can insert their own social connections" ON social_connections;
DROP POLICY IF EXISTS "Users can update their own social connections" ON social_connections;
DROP POLICY IF EXISTS "Users can delete their own social connections" ON social_connections;

CREATE POLICY "Users can view their own social connections" ON social_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own social connections" ON social_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own social connections" ON social_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own social connections" ON social_connections FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TRIGGER FOR LINK CLICKS
-- ========================================
CREATE OR REPLACE FUNCTION increment_link_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE links SET total_clicks = total_clicks + 1 WHERE id = NEW.link_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_link_click ON link_clicks;
CREATE TRIGGER on_link_click
    AFTER INSERT ON link_clicks
    FOR EACH ROW EXECUTE FUNCTION increment_link_clicks();

-- ========================================
-- TRIGGER FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_links_updated_at ON links;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON links FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_position ON links(user_id, position);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_user_id ON subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);

-- Success message
SELECT 'All tables created successfully!' as message;
