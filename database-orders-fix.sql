-- ========================================
-- BeakyBabe - Fix Orders RLS Policies
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;

-- Create correct policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = seller_id);

-- Depending on how orders are created (via webhook or client), we might need insert policies
-- For now, assuming server-side creation or public creation via checkout
-- If orders are created by anyone (e.g. buyers), we need an insert policy
CREATE POLICY "Anyone can insert orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON orders TO authenticated;
GRANT SELECT, INSERT ON orders TO anon;
