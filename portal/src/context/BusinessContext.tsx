import React, { createContext, useContext, useEffect, useState } from 'react';
import { portalFetch } from '../lib/api';

export interface BusinessData {
  slug: string;
  businessName: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt: { seconds: number } | null;
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageStatus: 'no_page' | 'deployed';
  razorpayPaymentLink: string | null;
  content: Record<string, string>;
  contentKeys: string[];
}

interface BusinessContextType {
  business: BusinessData | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  loading: true,
  error: '',
  refetch: () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    portalFetch('/api/portal/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBusiness(data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tick]);

  return (
    <BusinessContext.Provider value={{ business, loading, error, refetch: () => setTick((t) => t + 1) }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
