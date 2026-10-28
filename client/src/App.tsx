import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { ToastContainer } from './components/ToastContainer.js';

// Pages
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { AuctionsPage } from './pages/AuctionsPage.js';
import { AuctionDetailPage } from './pages/AuctionDetailPage.js';
import { CreateListingPage } from './pages/CreateListingPage.js';
import { MyListingsPage } from './pages/MyListingsPage.js';
import { MyBidsPage } from './pages/MyBidsPage.js';
import { SavedSearchesPage } from './pages/SavedSearchesPage.js';
import { AIAssistantPage } from './pages/AIAssistantPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { HandoverPage } from './pages/HandoverPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="p-12 text-center text-sm text-slate-400">Verifying student authentication...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
              <Navbar />
              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/auctions" element={<AuctionsPage />} />
                  <Route path="/auctions/:id" element={<AuctionDetailPage />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/sell"
                    element={
                      <ProtectedRoute>
                        <CreateListingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sell/edit/:id"
                    element={
                      <ProtectedRoute>
                        <CreateListingPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-listings"
                    element={
                      <ProtectedRoute>
                        <MyListingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-bids"
                    element={
                      <ProtectedRoute>
                        <MyBidsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/saved-searches"
                    element={
                      <ProtectedRoute>
                        <SavedSearchesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/assistant" element={<AIAssistantPage />} />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/handover/:id"
                    element={
                      <ProtectedRoute>
                        <HandoverPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
              <ToastContainer />
            </div>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
