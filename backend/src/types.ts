import { Timestamp } from 'firebase-admin/firestore';

export interface BusinessDocument {
  // Identity
  businessName: string;
  businessSlug: string;

  // Subscription
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt: Timestamp | null;
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

  // Customer portal owner
  ownerEmail: string | null;
  ownerUid: string | null;

  // Editable page content (key-value text fields)
  content?: Record<string, string>;
  contentKeys?: string[];

  // Meta
  createdAt: Timestamp;
  contentUpdatedAt?: Timestamp;
}

export interface WebhookEvent {
  eventType: string;
  subscriptionId: string;
  businessSlug: string | null;
  processedAt: Timestamp;
  rawPayload: object;
}
