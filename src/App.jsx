import React from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import LoginPage from '@/components/LoginPage';
import AuthenticatedApp from '@/components/AuthenticatedApp';
import PublicHealthForm from '@/pages/PublicHealthForm';
import PublicFeedback from '@/pages/PublicFeedback';
import BookingDetailsPage from '@/components/BookingDetailsPage';

const ProtectedRoute = ({ children }) => {
    const { session, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f1ed] text-[#8b7355]">Loading...</div>;
    if (!session) return <Navigate to="/login" replace />;
    return children;
};

const PublicOnlyRoute = ({ children }) => {
    const { session, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f1ed] text-[#8b7355]">Loading...</div>;
    if (session) return <Navigate to="/" replace />;
    return children;
};

function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Helmet>
                        <title>Lema Filipino Spa</title>
                        <meta name="description" content="Lema Filipino Spa Service Management System" />
                    </Helmet>
                    
                    <Routes>
                        <Route 
                            path="/health-form" 
                            element={<PublicHealthForm />} 
                        />
                        <Route 
                            path="/feedback-form" 
                            element={<PublicFeedback />} 
                        />
                        <Route 
                            path="/booking-details/:reference_id" 
                            element={<BookingDetailsPage />} 
                        />
                        
                        <Route 
                            path="/login" 
                            element={
                                <PublicOnlyRoute>
                                    <LoginPage />
                                </PublicOnlyRoute>
                            } 
                        />
                        
                        <Route 
                            path="/*" 
                            element={
                                <ProtectedRoute>
                                    <AuthenticatedApp />
                                </ProtectedRoute>
                            } 
                        />
                    </Routes>
                    
                    <Toaster />
                </BrowserRouter>
            </AuthProvider>
        </LanguageProvider>
    );
}

export default App;