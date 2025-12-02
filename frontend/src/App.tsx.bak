import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useLocationStore } from './store/useLocationStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import FamilyPage from './pages/FamilyPage';
import MobileConfigPage from './pages/MobileConfigPage';
import MessagesPage from './pages/MessagesPage';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const { loadUser, isLoading, isAuthenticated } = useAuthStore();
  const { initWebSocket } = useLocationStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initWebSocket();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/family"
            element={
              <ProtectedRoute>
                <FamilyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owntracks"
            element={
              <ProtectedRoute>
                <MobileConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '0.75rem',
            background: '#333',
            color: '#fff',
            padding: '12px 20px',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}

export default App;
