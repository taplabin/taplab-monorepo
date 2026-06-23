import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import PagesSelector from './pages/PagesSelector';
import Feedback from './pages/Feedback';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );
}

function NoBusiness() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No page linked to this account.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact TapLab support to get set up.</p>
        <button
          onClick={() => signOut(auth)}
          className="mt-5 text-xs text-red-500 dark:text-red-400 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function PortalApp() {
  const { businesses, businessesLoading, selectedSlug } = useBusiness();

  if (businessesLoading) return <LoadingSpinner />;
  if (businesses.length === 0) return <NoBusiness />;

  const goToDashboard = <Navigate to="/" replace />;
  const goToPages = <Navigate to="/pages" replace />;

  return (
    <Routes>
      <Route path="/pages" element={<PagesSelector />} />
      <Route path="/"          element={selectedSlug ? <Dashboard />  : goToPages} />
      <Route path="/editor"    element={selectedSlug ? <Editor />     : goToPages} />
      <Route path="/billing"   element={selectedSlug ? <Billing />    : goToPages} />
      <Route path="/analytics" element={selectedSlug ? <Analytics />  : goToPages} />
      <Route path="/settings"  element={selectedSlug ? <Settings />   : goToPages} />
      <Route path="/feedback"  element={selectedSlug ? <Feedback />   : goToPages} />
      <Route path="/login"     element={goToDashboard} />
      <Route path="*"          element={selectedSlug ? goToDashboard  : goToPages} />
    </Routes>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        {user === undefined ? (
          <LoadingSpinner />
        ) : (
          <BrowserRouter>
            {user ? (
              <BusinessProvider>
                <PortalApp />
              </BusinessProvider>
            ) : (
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*"      element={<Navigate to="/login" replace />} />
              </Routes>
            )}
          </BrowserRouter>
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
