import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import {
  clearStoredAuth,
  decodeJwtPayload,
  persistStoredAuth,
  readStoredAuth,
} from './services/api';

const HomePage = lazy(() => import('./pages/HomePage'));
const SemesterPage = lazy(() => import('./pages/SemesterPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DepartmentPage = lazy(() => import('./pages/DepartmentPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUploadPage = lazy(() => import('./pages/AdminUploadPage'));
const AdminFilesPage = lazy(() => import('./pages/AdminFilesPage'));
const AdminManagePage = lazy(() => import('./pages/AdminManagePage'));

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [auth, setAuth] = useState(() => readStoredAuth());

  const isAuthenticated = useMemo(() => Boolean(auth.token), [auth.token]);

  useEffect(() => {
    // Keep auth state in sync with browser storage and ensure expired tokens are cleared
    const checkSession = () => {
      const { token, username } = readStoredAuth();

      if (token) {
        try {
          const decoded = decodeJwtPayload(token);
          if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            // token expired
            clearStoredAuth();
            setAuth({ token: '', username: '' });
            return;
          }
        } catch (e) {
          // malformed token, clear
          clearStoredAuth();
          setAuth({ token: '', username: '' });
          return;
        }
      }

      if (token && username) {
        persistStoredAuth({ token, username });
      }

      setAuth({ token, username });
    };

    // run once on mount
    checkSession();

    // check periodically in case token expires while the app is open
    const interval = setInterval(checkSession, 60 * 1000);
    window.addEventListener('storage', checkSession);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkSession);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/admin') && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const logout = () => {
    clearStoredAuth();
    setAuth({ token: '', username: '' });
    setMobileSidebarOpen(false);
    navigate('/', { replace: true });
  };

  const isAdminLayout = location.pathname.startsWith('/admin');
  const showSidebar = isAdminLayout || location.pathname === '/';

  return (
    <AppShell
      auth={auth}
      onLogout={logout}
      isAdminLayout={isAdminLayout}
      showSidebar={showSidebar}
      mobileSidebarOpen={mobileSidebarOpen}
      setMobileSidebarOpen={setMobileSidebarOpen}
    >
      <ErrorBoundary>
        <Suspense fallback={<div className="page-loader">Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/semester/:id" element={<SemesterPage />} />
            <Route path="/department/:id" element={<DepartmentPage />} />
            <Route path="/subject/:id" element={<SubjectPage />} />
            <Route path="/login" element={<LoginPage setAuth={setAuth} />} />

            <Route
              path="/admin"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AdminDashboard auth={auth} onLogout={logout} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/upload"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AdminUploadPage auth={auth} onLogout={logout} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/files"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AdminFilesPage auth={auth} onLogout={logout} />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/manage"
              element={(
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AdminManagePage auth={auth} onLogout={logout} />
                </ProtectedRoute>
              )}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}

export default App;

