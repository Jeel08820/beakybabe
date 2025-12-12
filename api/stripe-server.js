// ========================================
// BeakyBabe - Stripe Server-Side Integration
// ========================================
// This file should be deployed as serverless functions (Supabase Edge Functions,
// Vercel Functions, or similar). DO NOT expose your Stripe secret key in client code.

// Environment variables (set these in your serverless platform):
// STRIPE_SECRET_KEY=sk_test_your_secret_key
// STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
// SUPABASE_URL=your_supabase_url
// SUPABASE_SERVICE_KEY=your_service_role_key
// PLATFORM_FEE_PERCENT=5

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');

// ========================================
// CREATE STRIPE CONNECT ACCOUNT
// ========================================
// POST /api/create-connect-account

export async function createConnectAccount(req) {
    const { userId } = req.body;

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
        }
    });

    // Save account ID to user profile
    await supabase
        .from('profiles')
        .update({ stripe_account_id: account.id })
        .eq('id', userId);

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL}/settings.html?tab=payouts`,
        return_url: `${process.env.APP_URL}/settings.html?tab=payouts&connected=true`,
        type: 'account_onboarding'
    });

    return {
        accountId: account.id,
        onboardingUrl: accountLink.url
    };
}

// ========================================
// GET CONNECT ACCOUNT STATUS
// ========================================
// GET /api/connect-account-status?userId=xxx

export async function getConnectAccountStatus(req) {
    const { userId } = req.query;

    // Get user's Stripe account ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', userId)
        .single();

    if (!profile?.stripe_account_id) {
        return { connected: false, payoutsEnabled: false };
    }

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    return {
        connected: true,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted
    };
}

// ========================================
// CREATE CHECKOUT SESSION
// ========================================
// POST /api/create-checkout-session

export async function createCheckoutSession(req) {
    const {
        productId,
        priceAmount, // In cents
        productName,
        productDescription,
        sellerAccountId,
        successUrl,
        cancelUrl,
        buyerEmail
    } = req.body;

    // Calculate platform fee
    const platformFee = Math.round(priceAmount * (PLATFORM_FEE_PERCENT / 100));

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: productName,
                    description: productDescription
                },
                unit_amount: priceAmount
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: buyerEmail,
        payment_intent_data: {
            application_fee_amount: platformFee,
            transfer_data: {
                destination: sellerAccountId
            }
        },
        metadata: {
            productId,
            sellerAccountId
        }
    });

    return { id: session.id, url: session.url };
}

// ========================================
// CREATE PAYMENT INTENT (FOR TIPS)
// ========================================
// POST /api/create-payment-intent

export async function createPaymentIntent(req) {
    const { amount, sellerAccountId, tipMessage } = req.body;

    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        application_fee_amount: platformFee,
        transfer_data: {
            destination: sellerAccountId
        },
        metadata: {
            type: 'tip',
            message: tipMessage || ''
        }
    });

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
    };
}

// ========================================
// CREATE SUBSCRIPTION (FOR MEMBERSHIPS)
// ========================================
// POST /api/create-subscription

export async function createSubscription(req) {
    const {
        priceId, // Stripe Price ID
        customerId,
        sellerAccountId,
        productId
    } = req.body;

    const platformFeePercent = PLATFORM_FEE_PERCENT;

    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        application_fee_percent: platformFeePercent,
        transfer_data: {
            destination: sellerAccountId
        },
        metadata: {
            productId
        }
    });

    return {
        subscriptionId: subscription.id,
        status: subscription.status
    };
}

// ========================================
// WEBHOOK HANDLER
// ========================================
// POST /api/stripe-webhook

export async function handleWebhook(req) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        throw new Error('Webhook signature verification failed');
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutComplete(event.data.object);
            break;

        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(event.data.object);
            break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
            await handleSubscriptionUpdate(event.data.object);
            break;

        case 'customer.subscription.deleted':
            await handleSubscriptionCanceled(event.data.object);
            break;

        case 'account.updated':
            await handleConnectAccountUpdate(event.data.object);
            break;
    }

    return { received: true };
}

// ========================================
// WEBHOOK EVENT HANDLERS
// ========================================

async function handleCheckoutComplete(session) {
    const { productId, sellerAccountId } = session.metadata;

    // Record the order
    await supabase.from('orders').insert({
        product_id: productId,
        seller_id: await getSellerIdFromStripeAccount(sellerAccountId),
        buyer_email: session.customer_email,
        amount: session.amount_total / 100,
        payment_status: 'completed',
        payment_provider: 'stripe',
        payment_id: session.payment_intent,
        completed_at: new Date().toISOString()
    });

    // Update product stats
    await supabase.rpc('increment_product_sales', {
        product_id: productId,
        amount: session.amount_total / 100
    });
}

async function handlePaymentSucceeded(paymentIntent) {
    if (paymentIntent.metadata.type === 'tip') {
        // Record tip
        console.log('Tip received:', paymentIntent.amount / 100);
    }
}

async function handleSubscriptionUpdate(subscription) {
    // Update user's subscription status
    if (subscription.metadata.userId) {
        await supabase
            .from('profiles')
            .update({
                plan: subscription.status === 'active' ? 'pro' : 'free',
                plan_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
            })
            .eq('id', subscription.metadata.userId);
    }
}

async function handleSubscriptionCanceled(subscription) {
    if (subscription.metadata.userId) {
        await supabase
            .from('profiles')
            .update({ plan: 'free', plan_expires_at: null })
            .eq('id', subscription.metadata.userId);
    }
}

async function handleConnectAccountUpdate(account) {
    // Update seller's payout status
    await supabase
        .from('profiles')
        .update({
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled
        })
        .eq('stripe_account_id', account.id);
}

async function getSellerIdFromStripeAccount(stripeAccountId) {
    const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_account_id', stripeAccountId)
        .single();
    return data?.id;
}

// ========================================
// PAYOUT MANAGEMENT
// ========================================
// GET /api/get-balance

export async function getBalance(req) {
    const { stripeAccountId } = req.query;

    const balance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId
    });

    return {
        available: balance.available[0]?.amount / 100 || 0,
        pending: balance.pending[0]?.amount / 100 || 0,
        currency: balance.available[0]?.currency || 'usd'
    };
}

// POST /api/create-payout
export async function createPayout(req) {
    const { stripeAccountId, amount } = req.body;

    const payout = await stripe.payouts.create(
        { amount: Math.round(amount * 100), currency: 'usd' },
        { stripeAccount: stripeAccountId }
    );

    return { payoutId: payout.id, status: payout.status };
}
