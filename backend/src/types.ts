import { Timestamp } from 'firebase-admin/firestore';

export interface BusinessDocument {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt: Timestamp | null;
  freeTrialEnabled: boolean;
  trialStartDate: Timestamp | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageJsUrl: string | null;
  componentTagName: string | null;
  pageVersion: string | null;
  pageStatus: 'no_page' | 'deployed';
  lastDeployedAt: Timestamp | null;
  razorpaySubscriptionId: string | null;
  razorpayPaymentLink: string | null;
  setupFee: number | null;
  brokerId: string | null;
  brokerName: string | null;
  commissionPercent: number | null;
  commissionPaid: boolean;
  commissionPayoutSent: boolean;
  commissionPayoutId: string | null;
  commissionPayoutAmount: number | null;
  commissionPayoutSentAt: Timestamp | null;
  streakBonusSent: boolean;
  streakBonusAmount: number | null;
  streakBonusPayoutId: string | null;
  streakBonusSentAt: Timestamp | null;
  referralBonusPending: boolean;
  referralBonusAmount: number | null;
  referralBonusSent: boolean;
  referralBonusPayoutId: string | null;
  referralBonusSentAt: Timestamp | null;
  leadId: string | null;
  ownerEmail: string | null;
  ownerUid: string | null;
  content?: Record<string, string>;
  contentKeys?: string[];
  notes?: string;
  createdAt: Timestamp;
  contentUpdatedAt?: Timestamp;
}

export interface BrokerDocument {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  ownerUid: string | null;
  referredBy: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  bankVerified: boolean;
  razorpayContactId: string | null;
  razorpayFundAccountId: string | null;
  createdAt: Timestamp;
}

export interface LeadDocument {
  brokerId: string;
  brokerName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  businessName: string;
  businessSlug: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string | null;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  setupFee: number;
  commissionPercent: number;
  freeTrialEnabled: boolean;
  trialDurationDays: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BrokerReferralDocument {
  referringBrokerId: string;
  name: string;
  phone: string;
  email: string;
  status: 'pending' | 'converted' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
}

export interface StreakTier {
  fromDeal: number;
  bonusAmount: number;
}

export interface StreakConfig {
  tiers: StreakTier[];
}

export interface WebhookEvent {
  eventType: string;
  subscriptionId: string;
  businessSlug: string | null;
  processedAt: Timestamp;
  rawPayload: object;
}
