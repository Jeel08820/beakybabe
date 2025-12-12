// ========================================
// BeakyBabe - Database API Functions
// ========================================

const DB = {
    // ========================================
    // PROFILE FUNCTIONS
    // ========================================

    async getProfile() {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .single();
        return { data, error };
    },

    async getProfileByUsername(username) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
        return { data, error };
    },

    async updateProfile(updates) {
        const user = await Auth.getUser();
        const { data, error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        return { data, error };
    },

    async checkUsernameAvailable(username) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
        return !data; // Available if no data found
    },

    // ========================================
    // LINKS FUNCTIONS
    // ========================================

    async getLinks() {
        const user = await Auth.getUser();
        console.log('getLinks - user:', user);

        if (!user) {
            console.error('getLinks - No user found');
            return { data: [], error: { message: 'Not authenticated' } };
        }

        const { data, error } = await supabaseClient
            .from('links')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true });

        console.log('getLinks - response:', { data, error });
        return { data: data || [], error };
    },

    async getLinksByUsername(username) {
        const { data: profile } = await this.getProfileByUsername(username);
        if (!profile) return { data: [], error: 'Profile not found' };

        const { data, error } = await supabaseClient
            .from('links')
            .select('*')
            .eq('user_id', profile.id)
            .eq('is_active', true)
            .order('position', { ascending: true });
        return { data: data || [], error };
    },

    async createLink(link) {
        const user = await Auth.getUser();
        if (!user) {
            return { data: null, error: { message: 'Not authenticated. Please log in again.' } };
        }

        const { data: links } = await this.getLinks();
        const position = links ? links.length : 0;

        const { data, error } = await supabaseClient
            .from('links')
            .insert({
                ...link,
                user_id: user.id,
                position
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
        }

        return { data, error };
    },

    async updateLink(id, updates) {
        const { data, error } = await supabaseClient
            .from('links')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async deleteLink(id) {
        const { error } = await supabaseClient
            .from('links')
            .delete()
            .eq('id', id);
        return { error };
    },

    async reorderLinks(linkIds) {
        const updates = linkIds.map((id, index) => ({
            id,
            position: index
        }));

        for (const update of updates) {
            await supabaseClient
                .from('links')
                .update({ position: update.position })
                .eq('id', update.id);
        }
        return { error: null };
    },

    // ========================================
    // ANALYTICS FUNCTIONS
    // ========================================

    async recordPageView(userId, visitorData = {}) {
        const { error } = await supabaseClient
            .from('page_views')
            .insert({
                user_id: userId,
                ...visitorData
            });
        return { error };
    },

    async recordLinkClick(linkId, userId, visitorData = {}) {
        const { error } = await supabaseClient
            .from('link_clicks')
            .insert({
                link_id: linkId,
                user_id: userId,
                ...visitorData
            });
        return { error };
    },

    async getAnalyticsSummary(days = 30) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get page views
        const { data: views, count: viewCount } = await supabaseClient
            .from('page_views')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('viewed_at', startDate.toISOString());

        // Get link clicks
        const { data: clicks, count: clickCount } = await supabaseClient
            .from('link_clicks')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .gte('clicked_at', startDate.toISOString());

        // Get subscriber count
        const { count: subscriberCount } = await supabaseClient
            .from('subscribers')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('is_active', true);

        // Get revenue
        const { data: orders } = await supabaseClient
            .from('orders')
            .select('amount')
            .eq('seller_id', user.id)
            .eq('payment_status', 'completed')
            .gte('completed_at', startDate.toISOString());

        const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.amount), 0) || 0;

        return {
            views: viewCount || 0,
            clicks: clickCount || 0,
            subscribers: subscriberCount || 0,
            revenue: totalRevenue
        };
    },

    async getViewsByDay(days = 7) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data } = await supabaseClient
            .from('page_views')
            .select('viewed_at')
            .eq('user_id', user.id)
            .gte('viewed_at', startDate.toISOString());

        // Group by day
        const grouped = {};
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            grouped[key] = 0;
        }

        data?.forEach(view => {
            const key = view.viewed_at.split('T')[0];
            if (grouped[key] !== undefined) {
                grouped[key]++;
            }
        });

        return Object.entries(grouped)
            .map(([date, count]) => ({ date, count }))
            .reverse();
    },

    async getTrafficSources(days = 30) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data } = await supabaseClient
            .from('page_views')
            .select('referrer_source')
            .eq('user_id', user.id)
            .gte('viewed_at', startDate.toISOString());

        // Count sources
        const sources = {};
        data?.forEach(view => {
            const source = view.referrer_source || 'direct';
            sources[source] = (sources[source] || 0) + 1;
        });

        const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;

        return Object.entries(sources)
            .map(([name, count]) => ({
                name,
                count,
                percent: Math.round((count / total) * 100)
            }))
            .sort((a, b) => b.count - a.count);
    },

    async getTopLinks(days = 30, limit = 5) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get links with click counts
        const { data: links } = await supabaseClient
            .from('links')
            .select('id, title, icon, total_clicks')
            .eq('user_id', user.id)
            .order('total_clicks', { ascending: false })
            .limit(limit);

        return links || [];
    },

    async getDeviceStats(days = 30) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data } = await supabaseClient
            .from('page_views')
            .select('visitor_device')
            .eq('user_id', user.id)
            .gte('viewed_at', startDate.toISOString());

        const devices = { mobile: 0, tablet: 0, desktop: 0 };
        data?.forEach(view => {
            const device = view.visitor_device || 'desktop';
            if (devices[device] !== undefined) {
                devices[device]++;
            }
        });

        const total = Object.values(devices).reduce((a, b) => a + b, 0) || 1;

        return Object.entries(devices).map(([name, count]) => ({
            name,
            count,
            percent: Math.round((count / total) * 100)
        }));
    },

    // ========================================
    // PRODUCTS FUNCTIONS
    // ========================================

    async getProducts() {
        const user = await Auth.getUser();
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true });
        return { data: data || [], error };
    },

    async createProduct(product) {
        const user = await Auth.getUser();
        const { data: products } = await this.getProducts();
        const position = products.length;

        const { data, error } = await supabaseClient
            .from('products')
            .insert({
                ...product,
                user_id: user.id,
                position
            })
            .select()
            .single();
        return { data, error };
    },

    async updateProduct(id, updates) {
        const { data, error } = await supabaseClient
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async deleteProduct(id) {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        return { error };
    },

    // ========================================
    // SUBSCRIBERS FUNCTIONS
    // ========================================

    async getSubscribers() {
        const user = await Auth.getUser();
        const { data, error } = await supabaseClient
            .from('subscribers')
            .select('*')
            .eq('user_id', user.id)
            .order('subscribed_at', { ascending: false });
        return { data: data || [], error };
    },

    async addSubscriber(userId, email, name = null) {
        const { data, error } = await supabaseClient
            .from('subscribers')
            .insert({
                user_id: userId,
                email,
                name
            })
            .select()
            .single();
        return { data, error };
    },

    async removeSubscriber(id) {
        const { error } = await supabaseClient
            .from('subscribers')
            .update({ is_active: false })
            .eq('id', id);
        return { error };
    },

    // ========================================
    // ORDERS FUNCTIONS
    // ========================================

    async getOrders(limit = 50) {
        const user = await Auth.getUser();
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*, products(title)')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        return { data: data || [], error };
    },

    async getRevenueStats(days = 30) {
        const user = await Auth.getUser();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data } = await supabaseClient
            .from('orders')
            .select('amount, completed_at')
            .eq('seller_id', user.id)
            .eq('payment_status', 'completed')
            .gte('completed_at', startDate.toISOString());

        const totalRevenue = data?.reduce((sum, o) => sum + parseFloat(o.amount), 0) || 0;
        const orderCount = data?.length || 0;
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        return {
            totalRevenue,
            orderCount,
            avgOrderValue
        };
    }
};

// Export DB helper
window.DB = DB;
