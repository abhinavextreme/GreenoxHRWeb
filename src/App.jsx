import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, clearTokens, loadTokens, saveTokens } from './api.js';
import { Loader } from './components/Loader.jsx';
import { Shell } from './components/Shell.jsx';
import { AttendancePage } from './pages/Attendance.jsx';
import { DashboardPage } from './pages/Dashboard.jsx';
import { EmployeesPage } from './pages/Employees.jsx';
import { LeavePage } from './pages/Leave.jsx';
import { LoginPage } from './pages/Login.jsx';
import { PasswordPage } from './pages/Password.jsx';
import { NotificationsPage } from './pages/Notifications.jsx';
import { SettingsPage } from './pages/Settings.jsx';
import { ShiftsPage } from './pages/Shifts.jsx';
import { disableWebPush, enableWebPush } from './push.js';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { accessToken } = loadTokens();
    if (!accessToken) {
      setReady(true);
      return;
    }
    api('/api/v1/auth/me')
      .then((me) => {
        setSession(me);
        if (!me.user?.mustChangePassword) enableWebPush().catch(() => {});
      })
      .catch(() => {
        clearTokens();
        setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const auth = useMemo(() => ({
    session,
    async login(email, password) {
      const data = await api('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password, platform: 'web' },
        token: '',
      });
      saveTokens(data.accessToken, data.refreshToken);
      const me = { user: data.user, employee: data.employee, outletAccess: data.outletAccess };
      setSession(me);
      if (!data.user.mustChangePassword) enableWebPush().catch(() => {});
      navigate(data.user.mustChangePassword ? '/password' : '/');
      return me;
    },
    async logout() {
      const { refreshToken } = loadTokens();
      try {
        await disableWebPush();
        if (refreshToken) await api('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } });
      } catch {
        // The local session still ends if the token is already gone.
      }
      clearTokens();
      setSession(null);
      navigate('/login');
    },
    replaceSession(next) {
      setSession(next);
    },
  }), [navigate, session]);

  if (!ready) {
    return <div className="boot"><Loader label="Loading Greenox HR…" /></div>;
  }

  const passwordChangeRequired = Boolean(session?.user?.mustChangePassword);

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to={passwordChangeRequired ? '/password' : '/'} replace /> : <LoginPage />} />
        {passwordChangeRequired ? (
          <Route path="*" element={<PasswordPage />} />
        ) : (
          <Route element={session ? <Shell /> : <Navigate to="/login" replace />}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="notices" element={<Navigate to="/notifications" replace />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        )}
      </Routes>
    </AuthContext.Provider>
  );
}
