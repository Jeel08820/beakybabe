// ========================================
// BeakyBabe - Email Service
// ========================================
// Uses SendGrid, Resend, or similar email service

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Load and compile email templates
const templatesDir = path.join(__dirname, '../emails');
const templates = {};

function loadTemplate(name) {
    if (!templates[name]) {
        const html = fs.readFileSync(path.join(templatesDir, `${name}.html`), 'utf-8');
        templates[name] = Handlebars.compile(html);
    }
    return templates[name];
}

// ========================================
// SEND WELCOME EMAIL
// ========================================

export async function sendWelcomeEmail(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) return { error: 'Profile not found' };

    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user) return { error: 'User not found' };

    const template = loadTemplate('welcome');
    const html = template({
        name: profile.full_name || profile.username,
        username: profile.username,
        dashboard_url: `${process.env.APP_URL}/dashboard.html`,
        help_url: `${process.env.APP_URL}/help`,
        unsubscribe_url: `${process.env.APP_URL}/unsubscribe?token=${generateUnsubscribeToken(userId)}`
    });

    const { data, error } = await resend.emails.send({
        from: 'BeakyBabe <hello@beakybabe.bio>',
        to: user.user.email,
        subject: 'Welcome to BeakyBabe! 🐦',
        html
    });

    return { data, error };
}

// ========================================
// SEND WEEKLY REPORT
// ========================================

export async function sendWeeklyReport(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile || !profile.email_notifications) {
        return { skipped: true };
    }

    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user) return { error: 'User not found' };

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Fetch analytics
    const { count: totalViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('viewed_at', startDate.toISOString());

    const { count: totalClicks } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('clicked_at', startDate.toISOString());

    // Previous week for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date();
    prevStartDate.setDate(prevStartDate.getDate() - 14);

    const { count: prevViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('viewed_at', prevStartDate.toISOString())
        .lt('viewed_at', startDate.toISOString());

    const { count: prevClicks } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('clicked_at', prevStartDate.toISOString())
        .lt('clicked_at', startDate.toISOString());

    // Top links
    const { data: topLinks } = await supabase
        .from('links')
        .select('title, total_clicks')
        .eq('user_id', userId)
        .order('total_clicks', { ascending: false })
        .limit(5);

    // Traffic sources
    const { data: viewsData } = await supabase
        .from('page_views')
        .select('referrer_source')
        .eq('user_id', userId)
        .gte('viewed_at', startDate.toISOString());

    const sourceCounts = {};
    viewsData?.forEach(v => {
        const source = v.referrer_source || 'direct';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const sourceTotal = Object.values(sourceCounts).reduce((a, b) => a + b, 0) || 1;

    const sources = Object.entries(sourceCounts)
        .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            percent: Math.round((count / sourceTotal) * 100)
        }))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 4);

    // Calculate changes
    const viewsChange = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : 0;
    const clicksChange = prevClicks > 0 ? Math.round(((totalClicks - prevClicks) / prevClicks) * 100) : 0;

    // CTR
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

    // AI Insights (Pro only)
    const insights = [];
    if (profile.plan === 'pro' || profile.plan === 'creator_plus') {
        if (viewsChange > 20) {
            insights.push({ icon: '📈', text: `Your views are up ${viewsChange}%! Consider adding more links to maximize engagement.` });
        }
        if (ctr < 5) {
            insights.push({ icon: '💡', text: 'Your click rate is below average. Try making link titles more compelling.' });
        }
        if (sourceCounts.instagram > (sourceTotal * 0.5)) {
            insights.push({ icon: '📱', text: 'Instagram is driving most of your traffic. Focus on content there!' });
        }
    }

    const template = loadTemplate('weekly-report');
    const html = template({
        name: profile.full_name || profile.username,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        total_views: totalViews || 0,
        views_change: viewsChange >= 0 ? `+${viewsChange}%` : `${viewsChange}%`,
        views_change_class: viewsChange >= 0 ? 'positive' : 'negative',
        total_clicks: totalClicks || 0,
        clicks_change: clicksChange >= 0 ? `+${clicksChange}%` : `${clicksChange}%`,
        clicks_change_class: clicksChange >= 0 ? 'positive' : 'negative',
        ctr,
        top_links: topLinks?.map((link, i) => ({
            rank: i + 1,
            title: link.title,
            clicks: link.total_clicks || 0
        })) || [],
        sources,
        is_pro: profile.plan !== 'free',
        insights,
        dashboard_url: `${process.env.APP_URL}/analytics.html`,
        settings_url: `${process.env.APP_URL}/settings.html`,
        unsubscribe_url: `${process.env.APP_URL}/unsubscribe?token=${generateUnsubscribeToken(userId)}&type=weekly_report`
    });

    const { data, error } = await resend.emails.send({
        from: 'BeakyBabe <reports@beakybabe.bio>',
        to: user.user.email,
        subject: `📊 Your BeakyBabe Weekly Report: ${totalViews} views`,
        html
    });

    return { data, error };
}

// ========================================
// SEND SALE NOTIFICATION
// ========================================

export async function sendSaleNotification(orderId) {
    const { data: order } = await supabase
        .from('orders')
        .select('*, products(*), profiles!orders_seller_id_fkey(*)')
        .eq('id', orderId)
        .single();

    if (!order) return { error: 'Order not found' };

    const { data: user } = await supabase.auth.admin.getUserById(order.seller_id);
    if (!user) return { error: 'Seller not found' };

    const saleAmount = parseFloat(order.amount);
    const platformFee = saleAmount * 0.05;
    const stripeFee = (saleAmount * 0.029) + 0.30;
    const netEarnings = saleAmount - platformFee - stripeFee;

    const template = loadTemplate('sale-notification');
    const html = template({
        name: order.profiles.full_name || order.profiles.username,
        product_emoji: getProductEmoji(order.products.type),
        product_name: order.products.title,
        product_type: formatProductType(order.products.type),
        customer_email: order.buyer_email,
        order_id: order.id.slice(0, 8).toUpperCase(),
        order_date: formatDate(new Date(order.completed_at)),
        sale_amount: saleAmount.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        stripe_fee: stripeFee.toFixed(2),
        net_earnings: netEarnings.toFixed(2),
        dashboard_url: `${process.env.APP_URL}/store.html`,
        settings_url: `${process.env.APP_URL}/settings.html`
    });

    const { data, error } = await resend.emails.send({
        from: 'BeakyBabe <sales@beakybabe.bio>',
        to: user.user.email,
        subject: `💰 You made a sale! $${saleAmount.toFixed(2)} for ${order.products.title}`,
        html
    });

    return { data, error };
}

// ========================================
// SEND NEW SUBSCRIBER NOTIFICATION
// ========================================

export async function sendNewSubscriberNotification(subscriberId) {
    const { data: subscriber } = await supabase
        .from('subscribers')
        .select('*, profiles(*)')
        .eq('id', subscriberId)
        .single();

    if (!subscriber) return { error: 'Subscriber not found' };

    const { data: user } = await supabase.auth.admin.getUserById(subscriber.user_id);
    if (!user) return { error: 'User not found' };

    const { data, error } = await resend.emails.send({
        from: 'BeakyBabe <hello@beakybabe.bio>',
        to: user.user.email,
        subject: `📧 New subscriber: ${subscriber.email}`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #a855f7, #ec4899); padding: 24px; text-align: center;">
                    <span style="font-size: 32px;">📧</span>
                    <h1 style="color: white; margin: 8px 0 0;">New Subscriber!</h1>
                </div>
                <div style="padding: 32px;">
                    <p style="font-size: 16px; color: #333;">Someone just subscribed to your updates!</p>
                    <div style="background: #f8f8fc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <strong>${subscriber.email}</strong>
                    </div>
                    <p style="font-size: 14px; color: #666;">
                        You now have <strong>${await getSubscriberCount(subscriber.user_id)}</strong> subscribers.
                    </p>
                    <p style="text-align: center; margin-top: 24px;">
                        <a href="${process.env.APP_URL}/dashboard.html" 
                           style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #a855f7, #ec4899); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            View Dashboard
                        </a>
                    </p>
                </div>
            </div>
        `
    });

    return { data, error };
}

// ========================================
// SCHEDULED: SEND ALL WEEKLY REPORTS
// ========================================
// Run this every Monday at 9 AM

export async function sendAllWeeklyReports() {
    // Get all users with weekly report enabled
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email_notifications', true);

    const results = [];

    for (const profile of profiles || []) {
        const result = await sendWeeklyReport(profile.id);
        results.push({ userId: profile.id, ...result });

        // Rate limit: wait 100ms between emails
        await new Promise(r => setTimeout(r, 100));
    }

    return results;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function generateUnsubscribeToken(userId) {
    // In production, use proper JWT or signed token
    return Buffer.from(`${userId}:${Date.now()}`).toString('base64');
}

function getProductEmoji(type) {
    switch (type) {
        case 'digital': return '📁';
        case 'tip': return '☕';
        case 'membership': return '⭐';
        default: return '📦';
    }
}

function formatProductType(type) {
    switch (type) {
        case 'digital': return 'Digital Download';
        case 'tip': return 'Tip';
        case 'membership': return 'Membership';
        default: return 'Product';
    }
}

async function getSubscriberCount(userId) {
    const { count } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);
    return count || 0;
}
