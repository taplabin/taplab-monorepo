import { createContext, useContext, useEffect, useState } from 'react';
import { devFetch } from '../lib/api';
import type { ValidationResult } from '../components/ValidationPanel';

export interface Job {
  id: string;
  businessName: string;
  pageType: string | null;
  status: string;
  materials: string[];
  materialsNotes: string | null;
  approvedBuildId: string | null;
}

export interface Build {
  id: string;
  buildNumber: number;
  stagingUrl: string;
  devName: string;
  claudeModel: string;
  createdAt: { _seconds: number } | null;
}

interface JobContextValue {
  slug: string;
  job: Job | null;
  builds: Build[];
  loading: boolean;
  error: string;
  appTsx: string;
  contentTs: string;
  claudeModel: string;
  validationResult: ValidationResult | null;
  validationNeeded: boolean;
  setAppTsx: (v: string) => void;
  setContentTs: (v: string) => void;
  setClaudeModel: (v: string) => void;
  setValidationResult: (r: ValidationResult | null) => void;
  reloadBuilds: () => Promise<void>;
}

const JobContext = createContext<JobContextValue | null>(null);

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJob must be used within JobProvider');
  return ctx;
}

export function JobProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [job, setJob] = useState<Job | null>(null);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appTsx, setAppTsxRaw] = useState('');
  const [contentTs, setContentTsRaw] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-6');
  const [validationResult, setValidationResultRaw] = useState<ValidationResult | null>(null);

  async function reloadBuilds() {
    const res = await devFetch(`/dev/jobs/${slug}/builds`);
    if (res.ok) {
      const data = await res.json();
      setBuilds(data.builds ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [jobRes, buildsRes] = await Promise.all([
          devFetch(`/dev/jobs/${slug}`),
          devFetch(`/dev/jobs/${slug}/builds`),
        ]);
        if (cancelled) return;
        if (!jobRes.ok) {
          const e = await jobRes.json().catch(() => ({}));
          setError(e.error ?? 'Could not load job');
          return;
        }
        setJob(await jobRes.json());
        if (buildsRes.ok) {
          const d = await buildsRes.json();
          setBuilds(d.builds ?? []);
        }
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  function setAppTsx(v: string) {
    setAppTsxRaw(v);
    setValidationResultRaw(null);
  }

  function setContentTs(v: string) {
    setContentTsRaw(v);
    setValidationResultRaw(null);
  }

  const validationNeeded =
    validationResult?.passed !== true &&
    (appTsx.trim() !== '' || contentTs.trim() !== '');

  return (
    <JobContext.Provider value={{
      slug, job, builds, loading, error,
      appTsx, contentTs, claudeModel, validationResult, validationNeeded,
      setAppTsx, setContentTs, setClaudeModel,
      setValidationResult: setValidationResultRaw,
      reloadBuilds,
    }}>
      {children}
    </JobContext.Provider>
  );
}
