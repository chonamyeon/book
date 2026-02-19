import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './firebase';
import { getRedirectResult } from 'firebase/auth';
import Home from './pages/Home';
import Editorial from './pages/Editorial';
import Result from './pages/Result';
import Celebrity from './pages/Celebrity';
import Quiz from './pages/Quiz';
import Library from './pages/Library';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  // Global Redirect Handler for Firebase Auth (Critical for iOS Safari)
  React.useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Global Redirect Login Success:", result.user.email);
        }
      } catch (error) {
        console.error("Global Redirect Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          alert(`도메인 승인 오류: Firebase 콘솔에서 '${window.location.hostname}'를 승인해야 합니다.`);
        }
      }
    };

    handleRedirect();
  }, []);

  return (
    <Router>
      <div className="max-w-[430px] mx-auto min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editorial" element={<Editorial />} />
          <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="/celebrity/:id" element={<Celebrity />} />
          <Route path="/celebrity" element={<Celebrity />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

