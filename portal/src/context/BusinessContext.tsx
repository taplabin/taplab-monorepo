import React, { createContext, useContext, useEffect, useState } from 'react';
import { portalFetch } from '../lib/api';

export interface BusinessSummary {
  slug: string;
  businessName: string;
  pageStatus: 'no_page' | 'deployed';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  freeTrialEnabled: boolean;
  trialStartDate: { seconds: number } | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
}

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
  pageViews: number;
}

interface BusinessContextType {
  businesses: BusinessSummary[];
  businessesLoading: boolean;
  business: BusinessData | null;
  loading: boolean;
  error: string;
  refetch: () => void;
  selectedSlug: string | null;
  selectBusiness: (slug: string) => void;
}

const BusinessContext = createContext<BusinessContextType>({
  businesses: [],
  businessesLoading: true,
  business: null,
  loading: true,
  error: '',
  refetch: () => {},
  selectedSlug: null,
  selectBusiness: () => {},
});

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);

  // No localStorage — slug is session-only state.
  // Fresh load always starts null so the selector is shown.
  // Single-business users get auto-selected below.
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setBusinessesLoading(true);
    portalFetch('/api/portal/businesses')
      .then((r) => r.json())
      .then((data) => {
        const list: BusinessSummary[] = data.businesses ?? [];
        setBusinesses(list);
        // Auto-select for single-business users — they have no choice to make
        if (list.length === 1) {
          setSelectedSlug(list[0].slug);
        }
      })
      .catch(() => {})
      .finally(() => setBusinessesLoading(false));
  }, []);

  // Fetch full business data when selectedSlug or tick changes.
  // tick is incremented both by refetch() and selectBusiness() so the
  // effect always re-runs even when the same slug is re-selected.
  useEffect(() => {
    if (!selectedSlug) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    portalFetch(`/api/portal/me?slug=${selectedSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBusiness(data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedSlug, tick]);

  const selectBusiness = (slug: string) => {
    setBusiness(null);
    setLoading(true);
    setSelectedSlug(slug);
    // Always increment tick so the fetch effect fires even if slug didn't change
    setTick((t) => t + 1);
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        businessesLoading,
        business,
        loading,
        error,
        refetch: () => setTick((t) => t + 1),
        selectedSlug,
        selectBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
