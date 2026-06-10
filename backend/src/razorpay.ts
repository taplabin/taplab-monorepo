import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Make Razorpay optional for development
const RAZORPAY_ENABLED = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export const razorpay = RAZORPAY_ENABLED
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  : null;

// Cache plans by "amount_cycle" key to avoid duplicate plan creation
const planCache = new Map<string, string>();

export async function getOrCreatePlan(
  amount: number,
  cycle: 'monthly' | 'yearly'
): Promise<string> {
  if (!razorpay) {
    // Return mock plan ID for development
    return `plan_dev_${amount}_${cycle}`;
  }

  const cacheKey = `${amount}_${cycle}`;

  if (planCache.has(cacheKey)) {
    return planCache.get(cacheKey)!;
  }

  const plan = await razorpay.plans.create({
    period: cycle === 'monthly' ? 'monthly' : 'yearly',
    interval: 1,
    item: {
      name: `TapLab ${cycle} subscription`,
      amount: amount * 100, // convert to paise
      currency: 'INR',
    },
  });

  planCache.set(cacheKey, plan.id);
  return plan.id;
}

export async function createSubscriptionAndLink(
  businessName: string,
  amount: number,
  billingCycle: 'monthly' | 'yearly',
  startAt?: number
) {
  if (!razorpay) {
    // Return mock data for development
    console.log('[DEV MODE] Razorpay disabled - returning mock subscription');
    return {
      razorpaySubscriptionId: `sub_dev_${Date.now()}`,
      paymentLinkUrl: `https://dev.razorpay.com/mock-link/${businessName}`,
    };
  }

  const planId = await getOrCreatePlan(amount, billingCycle);

  const subscriptionParams: any = {
    plan_id: planId,
    total_count: billingCycle === 'monthly' ? 120 : 10, // max 10 years
    quantity: 1,
    notes: { businessName },
  };

  if (startAt) subscriptionParams.start_at = startAt;

  const subscription: any = await razorpay.subscriptions.create(subscriptionParams);

  // Subscriptions have their own hosted payment page — no separate payment link needed
  return {
    razorpaySubscriptionId: subscription.id,
    paymentLinkUrl: subscription.short_url,
  };
}
