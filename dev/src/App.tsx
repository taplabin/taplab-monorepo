import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import Queue from './pages/Queue';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import Deploy from './pages/Deploy';
import Builds from './pages/Builds';
import JobLayout from './components/JobLayout';
import DesktopOnly from './components/DesktopOnly';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-5 h-5 rounded-full border-2 border-[#2087e6] border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [isDev, setIsDev] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsDev(null); return; }
    user.getIdTokenResult().then((result) => {
      if (result.claims.dev) {
        setIsDev(true);
      } else {
        setIsDev(false);
        signOut(auth);
      }
    });
  }, [user]);

  if (loading || (user && isDev === null)) return <Spinner />;

  if (!user) return <Login />;

  return (
    <DesktopOnly>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/job/:slug" element={<JobLayout />}>
            <Route index element={<Navigate to="editor" replace />} />
            <Route path="editor" element={<Editor />} />
            <Route path="preview" element={<Preview />} />
            <Route path="deploy" element={<Deploy />} />
            <Route path="builds" element={<Builds />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DesktopOnly>
  );
}
