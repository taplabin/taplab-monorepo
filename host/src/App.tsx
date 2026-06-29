import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BusinessPage from './pages/BusinessPage';
import PreviewPage from './pages/PreviewPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/preview/:token" element={<PreviewPage />} />
        <Route path="/:businessSlug" element={<BusinessPage />} />
      </Routes>
    </BrowserRouter>
  );
}
