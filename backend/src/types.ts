import { Timestamp } from 'firebase-admin/firestore';

export interface BusinessDocument {
  // Identity
  businessName: string;
  businessSlug: string;

  // Subscription
  subscriptionStatus: 'active' | 'inactive';
  freeTrialEnabled: boolean;
  trialStartDate: Timestamp | null;
  trialDurationDays: number;

  // Billing
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';

  // Page deployment
  pageJsUrl: string | null;
  componentTagName: string | null;
  pageVersion: string | null;
  pageStatus: 'no_page' | 'deployed';
  lastDeployedAt: Timestamp | null;

  // Razorpay
  razorpaySubscriptionId: string | null;
  razorpayPaymentLink: string | null;

  // Meta
  createdAt: Timestamp;
}

export interface WebhookEvent {
  eventType: string;
  subscriptionId: string;
  businessSlug: string | null;
  processedAt: Timestamp;
  rawPayload: object;
}
