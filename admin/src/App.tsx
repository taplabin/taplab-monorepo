import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import Overview from './pages/Overview';
import BusinessList from './pages/BusinessList';
import AddBusiness from './pages/AddBusiness';
import BusinessDetail from './pages/BusinessDetail';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) return <LoadingSpinner />;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/businesses" element={<BusinessList />} />
        <Route path="/businesses/new" element={<AddBusiness />} />
        <Route path="/business/:slug" element={<BusinessDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
