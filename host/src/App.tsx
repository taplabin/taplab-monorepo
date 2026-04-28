import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BusinessPage from './pages/BusinessPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:businessSlug" element={<BusinessPage />} />
      </Routes>
    </BrowserRouter>
  );
}
