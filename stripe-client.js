// ========================================
// BeakyBabe - Stripe Payment Integration
// ========================================

// NOTE: For production, these operations should happen on a backend server
// to keep your Stripe secret key secure. This file shows the client-side
// portion and outlines the server-side requirements.

const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_publishable_key_here';

// Initialize Stripe
let stripe = null;

function initStripe() {
    if (!stripe && typeof Stripe !== 'undefined') {
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    }
    return stripe;
}

// ========================================
// CLIENT-SIDE FUNCTIONS
// ========================================

const StripePayments = {
    /**
     * Redirect to Stripe Checkout for a product purchase
     * @param {Object} product - Product details
     * @param {string} sellerStripeAccountId - Connected Stripe account ID
     */
    async redirectToCheckout(product, sellerStripeAccountId) {
        const stripeInstance = initStripe();
        if (!stripeInstance) {
            throw new Error('Stripe not initialized');
        }

        // In production, call your backend to create a checkout session
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: product.id,
                priceAmount: Math.round(product.price * 100), // Convert to cents
                productName: product.title,
                productDescription: product.description,
                sellerAccountId: sellerStripeAccountId,
                successUrl: window.location.origin + '/checkout-success.html?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.href
            })
        });

        const session = await response.json();

        if (session.error) {
            throw new Error(session.error);
        }

        // Redirect to Checkout
        const result = await stripeInstance.redirectToCheckout({
            sessionId: session.id
        });

        if (result.error) {
            throw new Error(result.error.message);
        }
    },

    /**
     * Create a Stripe Connect onboarding link
     * @param {string} userId - The user's ID
     * @returns {string} - Onboarding URL
     */
    async createConnectOnboardingLink(userId) {
        const response = await fetch('/api/create-connect-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();
        return data.onboardingUrl;
    },

    /**
     * Check if user has completed Stripe Connect setup
     * @param {string} userId - The user's ID
     * @returns {Object} - Account status
     */
    async getConnectAccountStatus(userId) {
        const response = await fetch(`/api/connect-account-status?userId=${userId}`);
        return await response.json();
    },

    /**
     * Create a payment intent for tips
     * @param {number} amount - Tip amount in dollars
     * @param {string} sellerAccountId - Connected Stripe account ID
     */
    async createTipPaymentIntent(amount, sellerAccountId) {
        const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: Math.round(amount * 100),
                sellerAccountId
            })
        });

        return await response.json();
    }
};

// Export for use in other files
window.StripePayments = StripePayments;
