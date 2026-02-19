import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editorial from './pages/Editorial';
import Result from './pages/Result';
import Celebrity from './pages/Celebrity';
import Quiz from './pages/Quiz';
import Library from './pages/Library';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Router>
      <div className="max-w-[430px] mx-auto min-h-screen bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editorial" element={<Editorial />} />
          <Route path="/result" element={<Result />} />
          <Route path="/celebrity/:id" element={<Celebrity />} />
          <Route path="/celebrity" element={<Celebrity />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/library" element={<Library />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}
