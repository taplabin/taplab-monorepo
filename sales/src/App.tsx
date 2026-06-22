import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import BankVerification from './pages/BankVerification';
import Dashboard from './pages/Dashboard';
import Submissions from './pages/Submissions';
import Leaderboard from './pages/Leaderboard';
import Earnings from './pages/Earnings';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isBroker, setIsBroker] = useState<boolean | null>(null);
  const [bankVerified, setBankVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsBroker(null); setBankVerified(null); return; }
    user.getIdTokenResult().then(async (result) => {
      if (!result.claims.broker) {
        setIsBroker(false);
        signOut(auth);
        return;
      }
      setIsBroker(true);
      // Check bank verification status
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/broker/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setBankVerified(data.bankVerified ?? false);
      } catch {
        setBankVerified(false);
      }
    });
  }, [user]);

  if (loading || (user && isBroker === null)) {
    return <ThemeProvider><Spinner /></ThemeProvider>;
  }

  if (!user) {
    return <ThemeProvider><ToastProvider><Login /></ToastProvider></ThemeProvider>;
  }

  if (user && isBroker && bankVerified === false) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <BankVerification onVerified={() => setBankVerified(true)} />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/earnings"    element={<Earnings />} />
            <Route path="*"            element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
