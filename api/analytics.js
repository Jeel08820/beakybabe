// ========================================
// BeakyBabe - Analytics API Endpoints
// ========================================
// Deploy as Supabase Edge Functions or Vercel Serverless Functions

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ========================================
// TRACK PAGE VIEW
// ========================================
// POST /api/track-view

export async function trackPageView(req) {
    const {
        username,
        referrer,
        userAgent,
        ip // Get from request headers in production
    } = req.body;

    // Get user ID from username
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

    if (!profile) {
        return { error: 'Profile not found' };
    }

    // Parse user agent
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const device = isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop');

    // Parse browser
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Parse OS
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

    // Determine referrer source
    let referrerSource = 'direct';
    if (referrer) {
        if (referrer.includes('instagram.com')) referrerSource = 'instagram';
        else if (referrer.includes('tiktok.com')) referrerSource = 'tiktok';
        else if (referrer.includes('twitter.com') || referrer.includes('x.com')) referrerSource = 'twitter';
        else if (referrer.includes('youtube.com')) referrerSource = 'youtube';
        else if (referrer.includes('facebook.com')) referrerSource = 'facebook';
        else if (referrer.includes('linkedin.com')) referrerSource = 'linkedin';
        else if (referrer.includes('pinterest.com')) referrerSource = 'pinterest';
        else if (referrer.includes('reddit.com')) referrerSource = 'reddit';
        else if (referrer.includes('google.com')) referrerSource = 'google';
        else referrerSource = 'other';
    }

    // Get geo info (in production, use a service like MaxMind or ipinfo.io)
    const geoData = await getGeoFromIP(ip);

    // Insert page view
    const { error } = await supabase.from('page_views').insert({
        user_id: profile.id,
        visitor_ip: hashIP(ip), // Hash for privacy
        visitor_country: geoData?.country,
        visitor_city: geoData?.city,
        visitor_device: device,
        visitor_browser: browser,
        visitor_os: os,
        referrer: referrer,
        referrer_source: referrerSource
    });

    return { success: !error };
}

// ========================================
// TRACK LINK CLICK
// ========================================
// POST /api/track-click

export async function trackLinkClick(req) {
    const {
        linkId,
        referrer,
        userAgent,
        ip
    } = req.body;

    // Get link info
    const { data: link } = await supabase
        .from('links')
        .select('id, user_id')
        .eq('id', linkId)
        .single();

    if (!link) {
        return { error: 'Link not found' };
    }

    // Parse device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const device = isMobile ? 'mobile' : 'desktop';

    // Parse referrer
    let referrerSource = 'direct';
    if (referrer) {
        if (referrer.includes('instagram.com')) referrerSource = 'instagram';
        else if (referrer.includes('tiktok.com')) referrerSource = 'tiktok';
        else if (referrer.includes('twitter.com')) referrerSource = 'twitter';
        else if (referrer.includes('youtube.com')) referrerSource = 'youtube';
        else referrerSource = 'other';
    }

    // Get geo
    const geoData = await getGeoFromIP(ip);

    // Insert click
    const { error } = await supabase.from('link_clicks').insert({
        link_id: linkId,
        user_id: link.user_id,
        visitor_ip: hashIP(ip),
        visitor_country: geoData?.country,
        visitor_device: device,
        referrer_source: referrerSource
    });

    return { success: !error };
}

// ========================================
// GET ANALYTICS SUMMARY
// ========================================
// GET /api/analytics/summary?userId=xxx&days=30

export async function getAnalyticsSummary(req) {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(days));

    // Current period views
    const { count: currentViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('viewed_at', startDate.toISOString());

    // Previous period views
    const { count: prevViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('viewed_at', prevStartDate.toISOString())
        .lt('viewed_at', startDate.toISOString());

    // Current period clicks
    const { count: currentClicks } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('clicked_at', startDate.toISOString());

    // Previous period clicks
    const { count: prevClicks } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('clicked_at', prevStartDate.toISOString())
        .lt('clicked_at', startDate.toISOString());

    // Subscribers
    const { count: subscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

    // Revenue
    const { data: orders } = await supabase
        .from('orders')
        .select('amount')
        .eq('seller_id', userId)
        .eq('payment_status', 'completed')
        .gte('completed_at', startDate.toISOString());

    const revenue = orders?.reduce((sum, o) => sum + parseFloat(o.amount), 0) || 0;

    // Calculate change percentages
    const viewsChange = prevViews > 0 ? ((currentViews - prevViews) / prevViews * 100) : 0;
    const clicksChange = prevClicks > 0 ? ((currentClicks - prevClicks) / prevClicks * 100) : 0;

    return {
        views: currentViews || 0,
        viewsChange: Math.round(viewsChange),
        clicks: currentClicks || 0,
        clicksChange: Math.round(clicksChange),
        ctr: currentViews > 0 ? ((currentClicks / currentViews) * 100).toFixed(1) : 0,
        subscribers: subscribers || 0,
        revenue
    };
}

// ========================================
// GET VIEWS BY DAY
// ========================================
// GET /api/analytics/views-by-day?userId=xxx&days=30

export async function getViewsByDay(req) {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data } = await supabase
        .from('page_views')
        .select('viewed_at')
        .eq('user_id', userId)
        .gte('viewed_at', startDate.toISOString())
        .order('viewed_at', { ascending: true });

    // Group by day
    const grouped = {};
    for (let i = parseInt(days) - 1; i >= 0; i--) {
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

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}

// ========================================
// GET TOP LINKS
// ========================================
// GET /api/analytics/top-links?userId=xxx&limit=5

export async function getTopLinks(req) {
    const { userId, limit = 5 } = req.query;

    const { data } = await supabase
        .from('links')
        .select('id, title, icon, total_clicks')
        .eq('user_id', userId)
        .order('total_clicks', { ascending: false })
        .limit(parseInt(limit));

    return data || [];
}

// ========================================
// GET TRAFFIC SOURCES
// ========================================
// GET /api/analytics/traffic-sources?userId=xxx&days=30

export async function getTrafficSources(req) {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data } = await supabase
        .from('page_views')
        .select('referrer_source')
        .eq('user_id', userId)
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
}

// ========================================
// GET DEVICE BREAKDOWN
// ========================================
// GET /api/analytics/devices?userId=xxx&days=30

export async function getDevices(req) {
    const { userId, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data } = await supabase
        .from('page_views')
        .select('visitor_device')
        .eq('user_id', userId)
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
}

// ========================================
// GET LOCATIONS
// ========================================
// GET /api/analytics/locations?userId=xxx&days=30&limit=10

export async function getLocations(req) {
    const { userId, days = 30, limit = 10 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data } = await supabase
        .from('page_views')
        .select('visitor_country')
        .eq('user_id', userId)
        .gte('viewed_at', startDate.toISOString());

    const countries = {};
    data?.forEach(view => {
        if (view.visitor_country) {
            countries[view.visitor_country] = (countries[view.visitor_country] || 0) + 1;
        }
    });

    const total = Object.values(countries).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(countries)
        .map(([country, count]) => ({
            country,
            count,
            percent: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, parseInt(limit));
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function getGeoFromIP(ip) {
    // In production, use a service like ipinfo.io or MaxMind
    // Example:
    // const response = await fetch(`https://ipinfo.io/${ip}/json?token=YOUR_TOKEN`);
    // return await response.json();
    return { country: null, city: null };
}

function hashIP(ip) {
    // Simple hash for privacy - use proper hashing in production
    if (!ip) return null;
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
        hash = ((hash << 5) - hash) + ip.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
}
