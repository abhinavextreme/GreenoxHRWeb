import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '../constants/index.js';
import { useAuth } from '../shared/auth/AuthProvider.jsx';
import { Loader } from '../shared/components/Loader.jsx';
import { Shell } from '../shared/layout/Shell.jsx';
import { AttendancePage } from '../modules/attendance/pages/AttendancePage.jsx';
import { LoginPage } from '../modules/auth/pages/LoginPage.jsx';
import { PasswordPage } from '../modules/auth/pages/PasswordPage.jsx';
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage.jsx';
import { EmployeesPage } from '../modules/employees/pages/EmployeesPage.jsx';
import { LeavePage } from '../modules/leave/pages/LeavePage.jsx';
import { NotificationsPage } from '../modules/notifications/pages/NotificationsPage.jsx';
import { SettingsPage } from '../modules/settings/pages/SettingsPage.jsx';
import { ShiftsPage } from '../modules/shifts/pages/ShiftsPage.jsx';

export function AppRouter() {
  const { session, ready } = useAuth();

  if (!ready) {
    return <div className="boot"><Loader label="Loading Greenox HR…" /></div>;
  }

  const passwordChangeRequired = Boolean(session?.user?.mustChangePassword);

  return (
    <Routes>
      <Route path={ROUTES.login} element={session ? <Navigate to={passwordChangeRequired ? ROUTES.password : ROUTES.home} replace /> : <LoginPage />} />
      {passwordChangeRequired ? (
        <Route path="*" element={<PasswordPage />} />
      ) : (
        <Route element={session ? <Shell /> : <Navigate to={ROUTES.login} replace />}>
          <Route index element={<DashboardPage />} />
          <Route path={ROUTES.employees.slice(1)} element={<EmployeesPage />} />
          <Route path={ROUTES.attendance.slice(1)} element={<AttendancePage />} />
          <Route path={ROUTES.leave.slice(1)} element={<LeavePage />} />
          <Route path={ROUTES.shifts.slice(1)} element={<ShiftsPage />} />
          <Route path={ROUTES.notifications.slice(1)} element={<NotificationsPage />} />
          <Route path={ROUTES.notices.slice(1)} element={<Navigate to={ROUTES.notifications} replace />} />
          <Route path={ROUTES.settings.slice(1)} element={<SettingsPage />} />
        </Route>
      )}
    </Routes>
  );
}
