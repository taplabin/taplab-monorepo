import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Overview from './pages/Overview';
import BusinessList from './pages/BusinessList';
import AddBusiness from './pages/AddBusiness';
import BusinessDetail from './pages/BusinessDetail';
import Alerts from './pages/Alerts';
import Brokers from './pages/Brokers';
import BrokerDetail from './pages/BrokerDetail';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import BrokerFeedback from './pages/BrokerFeedback';
import CustomerFeedback from './pages/CustomerFeedback';
import BrokerReferrals from './pages/BrokerReferrals';
import Settings from './pages/Settings';
import AddBroker from './pages/AddBroker';
import Jobs from './pages/Jobs';
import AdminJobDetail from './pages/AdminJobDetail';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(null); return; }
    user.getIdTokenResult().then((result) => {
      if (result.claims.admin) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        signOut(auth);
      }
    });
  }, [user]);

  if (loading || (user && isAdmin === null)) return (
    <ThemeProvider>
      <LoadingSpinner />
    </ThemeProvider>
  );

  if (!user) return (
    <ThemeProvider>
      <ToastProvider>
        <Login />
      </ToastProvider>
    </ThemeProvider>
  );

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                  element={<Overview />} />
            <Route path="/businesses"        element={<BusinessList />} />
            <Route path="/businesses/new"    element={<AddBusiness />} />
            <Route path="/business/:slug"    element={<BusinessDetail />} />
            <Route path="/alerts"            element={<Alerts />} />
            <Route path="/brokers"           element={<Brokers />} />
            <Route path="/brokers/new"       element={<AddBroker />} />
            <Route path="/broker/:id"        element={<BrokerDetail />} />
            <Route path="/leads"             element={<Leads />} />
            <Route path="/leads/:id"         element={<LeadDetail />} />
            <Route path="/settings"          element={<Settings />} />
            <Route path="/streak-config"     element={<Navigate to="/settings" replace />} />
            <Route path="/storage"           element={<Navigate to="/settings" replace />} />
            <Route path="/jobs"              element={<Jobs />} />
            <Route path="/jobs/:slug"        element={<AdminJobDetail />} />
            <Route path="/broker-feedback"   element={<BrokerFeedback />} />
            <Route path="/customer-feedback" element={<CustomerFeedback />} />
            <Route path="/broker-referrals"  element={<BrokerReferrals />} />
            <Route path="*"                  element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
