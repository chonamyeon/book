import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-amber-400/60 text-xs font-bold tracking-widest uppercase">Loading</p>
        </div>
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
