import { db } from './firestore.js';
import { createPayout } from './razorpayx.js';
import { StreakConfig } from './types.js';
import type { FastifyBaseLogger } from 'fastify';

export async function handleCommissionPayout(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.commissionPayoutSent || !biz.setupFee || !biz.commissionPercent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.bankVerified || !broker.razorpayFundAccountId) return;
  const amount = Math.round((biz.commissionPercent / 100) * biz.setupFee);
  if (amount <= 0) return;
  try {
    const payoutId = await createPayout({ fundAccountId: broker.razorpayFundAccountId, amountInRupees: amount, narration: `Commission for ${biz.businessName}` });
    await db.collection('businesses').doc(slug).update({
      commissionPayoutSent: true, commissionPayoutId: payoutId, commissionPayoutAmount: amount, commissionPayoutSentAt: new Date(),
    });
  } catch (err) { log.error({ err, slug }, 'Commission payout failed'); }
}

export async function handleStreakBonus(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.streakBonusSent || !biz.commissionPayoutSent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.bankVerified || !broker.razorpayFundAccountId) return;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const dealsSnap = await db.collection('businesses')
    .where('brokerId', '==', biz.brokerId)
    .where('commissionPayoutSent', '==', true)
    .where('commissionPayoutSentAt', '>=', startOfMonth)
    .where('commissionPayoutSentAt', '<=', endOfMonth)
    .get();
  const dealNumber = dealsSnap.size;
  const configDoc = await db.doc('config/streak').get();
  const tiers: StreakConfig['tiers'] = configDoc.exists ? (configDoc.data() as StreakConfig).tiers : [{ fromDeal: 6, bonusAmount: 500 }, { fromDeal: 11, bonusAmount: 1000 }, { fromDeal: 16, bonusAmount: 1500 }];
  const tier = [...tiers].sort((a, b) => b.fromDeal - a.fromDeal).find((t) => dealNumber >= t.fromDeal);
  if (!tier) return;
  try {
    const payoutId = await createPayout({ fundAccountId: broker.razorpayFundAccountId, amountInRupees: tier.bonusAmount, narration: `Streak bonus deal #${dealNumber} — ${biz.businessName}` });
    await db.collection('businesses').doc(slug).update({
      streakBonusSent: true, streakBonusAmount: tier.bonusAmount, streakBonusPayoutId: payoutId, streakBonusSentAt: new Date(),
    });
  } catch (err) { log.error({ err, slug }, 'Streak bonus payout failed'); }
}

export async function handleReferralFlag(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.referralBonusPending || biz.referralBonusSent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.referredBy) return;
  const prev = await db.collection('businesses').where('brokerId', '==', biz.brokerId).where('commissionPayoutSent', '==', true).get();
  // prev.size includes current business (already updated), so first deal = size 1
  if (prev.size !== 1) return;
  try {
    await db.collection('businesses').doc(slug).update({ referralBonusPending: true });
  } catch (err) { log.error({ err, slug }, 'Failed to flag referral bonus'); }
}
