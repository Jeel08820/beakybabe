// ========================================
// BeakyBabe - Production Configuration
// ========================================
// This file detects environment and uses appropriate settings

// Detect if we're in production (Vercel, Netlify, or custom domain)
const isProduction = window.location.hostname !== 'localhost' &&
    !window.location.hostname.includes('127.0.0.1');

// Production Supabase credentials
const SUPABASE_URL = 'https://efbvstybjgzqumsmnuhm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmYnZzdHliamd6cXVtc21udWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzkwNzcsImV4cCI6MjA4MTExNTA3N30.8og_WrKwVqL6VlzvyIY1vq87osH5Fcb3InE7VkmPZts';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabase;
window.isProduction = isProduction;

// App configuration
const AppConfig = {
    appName: 'BeakyBabe',
    appUrl: isProduction ? 'https://beakybabe.bio' : 'http://localhost:3000',
    supportEmail: 'support@beakybabe.bio',

    // Feature flags
    features: {
        analytics: true,
        store: true,
        socialSync: true,
        aiFeatures: false, // Coming soon
    },

    // Stripe (set your keys here)
    stripe: {
        publishableKey: isProduction
            ? 'pk_live_YOUR_LIVE_KEY' // Replace with live key
            : 'pk_test_YOUR_TEST_KEY', // Replace with test key
        platformFeePercent: 5,
    },

    // Social OAuth redirect
    oauthRedirectUrl: isProduction
        ? 'https://beakybabe.bio/auth/callback'
        : 'http://localhost:3000/auth/callback',
};

window.AppConfig = AppConfig;

// ========================================
// Auth Helper Functions (Production Ready)
// ========================================

const Auth = {
    // Sign up with email and password
    async signUp(email, password, fullName) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: AppConfig.appUrl + '/dashboard.html'
                }
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Signup error:', error);
            return { data: null, error };
        }
    },

    // Sign in with email and password
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Login error:', error);
            return { data: null, error };
        }
    },

    // Sign in with OAuth (Google, GitHub, etc.)
    async signInWithOAuth(provider) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: AppConfig.appUrl + '/dashboard.html'
                }
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('OAuth error:', error);
            return { data: null, error };
        }
    },

    // Sign out
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '/';
            }
            return { error };
        } catch (error) {
            console.error('Logout error:', error);
            return { error };
        }
    },

    // Get current user
    async getUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },

    // Get current session
    async getSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    },

    // Send password reset email
    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: AppConfig.appUrl + '/reset-password.html'
            });
            return { data, error };
        } catch (error) {
            console.error('Reset password error:', error);
            return { data: null, error };
        }
    },

    // Update password
    async updatePassword(newPassword) {
        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });
            return { data, error };
        } catch (error) {
            console.error('Update password error:', error);
            return { data: null, error };
        }
    },

    // Listen for auth state changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // Check if user is authenticated (redirect if not)
    async requireAuth() {
        const session = await this.getSession();
        if (!session) {
            // Save current URL to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = '/login.html';
            return null;
        }
        return session;
    },

    // Redirect authenticated users away from auth pages
    async redirectIfAuthenticated() {
        const session = await this.getSession();
        if (session) {
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/dashboard.html';
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
            return true;
        }
        return false;
    }
};

// Export Auth helper
window.Auth = Auth;

// ========================================
// Global Error Handler
// ========================================
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('Global error:', { msg, url, lineNo, columnNo, error });

    // In production, you might want to send this to an error tracking service
    if (isProduction) {
        // Example: Send to logging service
        // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ msg, url, lineNo }) });
    }

    return false;
};

// ========================================
// Performance Monitoring
// ========================================
if (isProduction) {
    window.addEventListener('load', () => {
        // Log page load time
        const loadTime = performance.now();
        console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
    });
}

console.log(`BeakyBabe loaded (${isProduction ? 'Production' : 'Development'} mode)`);
