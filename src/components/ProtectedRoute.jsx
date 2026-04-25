import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingScreen from './LoadingScreen';

const Spinner = () => <LoadingScreen />;

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <Spinner />;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
