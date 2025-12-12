// ========================================
// BeakyBabe - Social Media Integration
// ========================================
// Sync content from TikTok, YouTube, and Instagram

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// API Keys (set in environment)
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;

// ========================================
// TIKTOK INTEGRATION
// ========================================

export const TikTok = {
    /**
     * Get OAuth URL for TikTok connection
     */
    getAuthUrl(userId, redirectUri) {
        const csrfState = Buffer.from(`${userId}:tiktok:${Date.now()}`).toString('base64');

        return `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${TIKTOK_CLIENT_KEY}` +
            `&scope=user.info.basic,video.list` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&state=${csrfState}`;
    },

    /**
     * Exchange auth code for access token
     */
    async exchangeCode(code, redirectUri) {
        const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            })
        });

        return await response.json();
    },

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CLIENT_KEY,
                client_secret: TIKTOK_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        return await response.json();
    },

    /**
     * Get user's TikTok profile
     */
    async getProfile(accessToken) {
        const response = await fetch(
            'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        return await response.json();
    },

    /**
     * Get latest videos
     */
    async getVideos(accessToken, maxCount = 5) {
        const response = await fetch(
            `https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,cover_image_url,share_url,like_count,view_count&max_count=${maxCount}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return await response.json();
    },

    /**
     * Sync TikTok videos to user's links
     */
    async syncToLinks(userId, accessToken) {
        const videosResponse = await this.getVideos(accessToken);

        if (!videosResponse.data?.videos) {
            return { success: false, error: 'Failed to fetch videos' };
        }

        const videos = videosResponse.data.videos;
        const synced = [];

        for (const video of videos) {
            // Check if link already exists
            const { data: existing } = await supabase
                .from('links')
                .select('id')
                .eq('user_id', userId)
                .eq('url', video.share_url)
                .single();

            if (existing) continue;

            // Create new link
            const { data: link } = await supabase
                .from('links')
                .insert({
                    user_id: userId,
                    title: video.title || 'TikTok Video',
                    url: video.share_url,
                    icon: '📱',
                    source: 'tiktok',
                    thumbnail: video.cover_image_url,
                    is_active: true
                })
                .select()
                .single();

            synced.push(link);
        }

        return { success: true, synced };
    }
};

// ========================================
// YOUTUBE INTEGRATION
// ========================================

export const YouTube = {
    /**
     * Get OAuth URL for YouTube connection
     */
    getAuthUrl(userId, redirectUri) {
        const state = Buffer.from(`${userId}:youtube:${Date.now()}`).toString('base64');

        return `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&scope=https://www.googleapis.com/auth/youtube.readonly` +
            `&access_type=offline` +
            `&state=${state}`;
    },

    /**
     * Exchange auth code for tokens
     */
    async exchangeCode(code, redirectUri) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            })
        });

        return await response.json();
    },

    /**
     * Get channel info
     */
    async getChannel(accessToken) {
        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        return await response.json();
    },

    /**
     * Get latest videos
     */
    async getVideos(accessToken, maxResults = 5) {
        // First get channel ID
        const channelResponse = await this.getChannel(accessToken);
        if (!channelResponse.items?.[0]) {
            return { error: 'Channel not found' };
        }

        const channelId = channelResponse.items[0].id;

        // Get uploads playlist
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        return await response.json();
    },

    /**
     * Sync YouTube videos to user's links
     */
    async syncToLinks(userId, accessToken) {
        const videosResponse = await this.getVideos(accessToken);

        if (!videosResponse.items) {
            return { success: false, error: 'Failed to fetch videos' };
        }

        const synced = [];

        for (const video of videosResponse.items) {
            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;

            // Check if link already exists
            const { data: existing } = await supabase
                .from('links')
                .select('id')
                .eq('user_id', userId)
                .eq('url', videoUrl)
                .single();

            if (existing) continue;

            // Create new link
            const { data: link } = await supabase
                .from('links')
                .insert({
                    user_id: userId,
                    title: video.snippet.title,
                    url: videoUrl,
                    icon: '📺',
                    source: 'youtube',
                    thumbnail: video.snippet.thumbnails?.high?.url,
                    is_active: true
                })
                .select()
                .single();

            synced.push(link);
        }

        return { success: true, synced };
    },

    /**
     * Get latest video using public API (no auth required)
     */
    async getLatestVideoPublic(channelUrl) {
        // Extract channel ID from URL
        let channelId = '';

        if (channelUrl.includes('/channel/')) {
            channelId = channelUrl.split('/channel/')[1].split('/')[0];
        } else if (channelUrl.includes('/@')) {
            // Handle @username format - need to look up channel ID
            const username = channelUrl.split('/@')[1].split('/')[0];
            const searchResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/search?` +
                `part=snippet&q=${username}&type=channel&key=${YOUTUBE_API_KEY}`
            );
            const searchData = await searchResponse.json();
            if (searchData.items?.[0]) {
                channelId = searchData.items[0].snippet.channelId;
            }
        }

        if (!channelId) {
            return { error: 'Could not find channel' };
        }

        // Get latest video
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&channelId=${channelId}&order=date&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
        );

        return await response.json();
    }
};

// ========================================
// INSTAGRAM INTEGRATION
// ========================================

export const Instagram = {
    /**
     * Get OAuth URL for Instagram Basic Display
     */
    getAuthUrl(userId, redirectUri) {
        const state = Buffer.from(`${userId}:instagram:${Date.now()}`).toString('base64');

        return `https://api.instagram.com/oauth/authorize?` +
            `client_id=${INSTAGRAM_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=user_profile,user_media` +
            `&response_type=code` +
            `&state=${state}`;
    },

    /**
     * Exchange code for short-lived token
     */
    async exchangeCode(code, redirectUri) {
        const response = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: INSTAGRAM_CLIENT_ID,
                client_secret: INSTAGRAM_CLIENT_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code
            })
        });

        return await response.json();
    },

    /**
     * Exchange short-lived token for long-lived token
     */
    async getLongLivedToken(shortLivedToken) {
        const response = await fetch(
            `https://graph.instagram.com/access_token?` +
            `grant_type=ig_exchange_token` +
            `&client_secret=${INSTAGRAM_CLIENT_SECRET}` +
            `&access_token=${shortLivedToken}`
        );

        return await response.json();
    },

    /**
     * Refresh long-lived token
     */
    async refreshToken(longLivedToken) {
        const response = await fetch(
            `https://graph.instagram.com/refresh_access_token?` +
            `grant_type=ig_refresh_token` +
            `&access_token=${longLivedToken}`
        );

        return await response.json();
    },

    /**
     * Get user profile
     */
    async getProfile(accessToken) {
        const response = await fetch(
            `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
        );

        return await response.json();
    },

    /**
     * Get user's media
     */
    async getMedia(accessToken, limit = 5) {
        const response = await fetch(
            `https://graph.instagram.com/me/media?` +
            `fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp` +
            `&limit=${limit}` +
            `&access_token=${accessToken}`
        );

        return await response.json();
    },

    /**
     * Sync Instagram posts to user's links
     */
    async syncToLinks(userId, accessToken) {
        const mediaResponse = await this.getMedia(accessToken);

        if (!mediaResponse.data) {
            return { success: false, error: 'Failed to fetch media' };
        }

        const synced = [];

        for (const post of mediaResponse.data) {
            // Check if link already exists
            const { data: existing } = await supabase
                .from('links')
                .select('id')
                .eq('user_id', userId)
                .eq('url', post.permalink)
                .single();

            if (existing) continue;

            // Create new link
            const title = post.caption?.substring(0, 50) || 'Instagram Post';
            const { data: link } = await supabase
                .from('links')
                .insert({
                    user_id: userId,
                    title: title + (post.caption?.length > 50 ? '...' : ''),
                    url: post.permalink,
                    icon: '📸',
                    source: 'instagram',
                    thumbnail: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
                    is_active: true
                })
                .select()
                .single();

            synced.push(link);
        }

        return { success: true, synced };
    }
};

// ========================================
// API ENDPOINTS
// ========================================

// POST /api/social/connect
export async function connectSocialAccount(req) {
    const { platform, userId, redirectUri } = req.body;

    let authUrl = '';

    switch (platform) {
        case 'tiktok':
            authUrl = TikTok.getAuthUrl(userId, redirectUri);
            break;
        case 'youtube':
            authUrl = YouTube.getAuthUrl(userId, redirectUri);
            break;
        case 'instagram':
            authUrl = Instagram.getAuthUrl(userId, redirectUri);
            break;
        default:
            return { error: 'Invalid platform' };
    }

    return { authUrl };
}

// POST /api/social/callback
export async function handleOAuthCallback(req) {
    const { code, state, redirectUri } = req.body;

    // Parse state
    const decoded = Buffer.from(state, 'base64').toString();
    const [userId, platform] = decoded.split(':');

    let tokens = {};
    let profile = {};

    switch (platform) {
        case 'tiktok':
            tokens = await TikTok.exchangeCode(code, redirectUri);
            if (tokens.access_token) {
                profile = await TikTok.getProfile(tokens.access_token);
            }
            break;
        case 'youtube':
            tokens = await YouTube.exchangeCode(code, redirectUri);
            if (tokens.access_token) {
                profile = await YouTube.getChannel(tokens.access_token);
            }
            break;
        case 'instagram':
            tokens = await Instagram.exchangeCode(code, redirectUri);
            if (tokens.access_token) {
                tokens = await Instagram.getLongLivedToken(tokens.access_token);
                profile = await Instagram.getProfile(tokens.access_token);
            }
            break;
    }

    // Store tokens in database
    await supabase.from('social_connections').upsert({
        user_id: userId,
        platform,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
        profile_data: profile,
        connected_at: new Date().toISOString()
    }, {
        onConflict: 'user_id,platform'
    });

    return { success: true, platform, profile };
}

// POST /api/social/sync
export async function syncSocialContent(req) {
    const { userId, platform } = req.body;

    // Get stored tokens
    const { data: connection } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single();

    if (!connection) {
        return { error: 'Not connected to ' + platform };
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
        // Refresh token
        let refreshed;
        switch (platform) {
            case 'tiktok':
                refreshed = await TikTok.refreshToken(connection.refresh_token);
                break;
            case 'instagram':
                refreshed = await Instagram.refreshToken(accessToken);
                break;
            // YouTube refresh handled by Google OAuth
        }

        if (refreshed?.access_token) {
            accessToken = refreshed.access_token;
            await supabase
                .from('social_connections')
                .update({
                    access_token: accessToken,
                    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                })
                .eq('id', connection.id);
        }
    }

    // Sync content
    let result;
    switch (platform) {
        case 'tiktok':
            result = await TikTok.syncToLinks(userId, accessToken);
            break;
        case 'youtube':
            result = await YouTube.syncToLinks(userId, accessToken);
            break;
        case 'instagram':
            result = await Instagram.syncToLinks(userId, accessToken);
            break;
    }

    return result;
}

// POST /api/social/disconnect
export async function disconnectSocialAccount(req) {
    const { userId, platform } = req.body;

    await supabase
        .from('social_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform', platform);

    return { success: true };
}
