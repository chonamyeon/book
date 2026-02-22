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
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Contact from './pages/Contact';
import ReviewDetail from './pages/ReviewDetail';
import ReadingNotes from './pages/ReadingNotes';
import ProtectedRoute from './components/ProtectedRoute';

import { AudioProvider } from './contexts/AudioContext';

export default function App() {
  // Global Redirect Handler logic moved to Profile.jsx to show debug logs on screen
  // This prevents the "redirect result consumed" issue where errors were hidden in console.

  return (
    <AudioProvider>
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
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/review/:id" element={<ReviewDetail />} />
            <Route path="/reading-notes" element={<ProtectedRoute><ReadingNotes /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AudioProvider>
  );
}
