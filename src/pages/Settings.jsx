import { useEffect, useState } from 'react';
import { api, roleLabel } from '../api.js';
import { useAuth } from '../App.jsx';

export function SettingsPage() {
  const { session, replaceSession, logout } = useAuth();
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [grant, setGrant] = useState({ userId: '', outletId: '', canApproveLeave: true });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const company = session.user.role === 'hr_admin' || session.user.role === 'super_admin';

  useEffect(() => {
    if (!company) return;
    Promise.all([api('/api/v1/admin/users?limit=100'), api('/api/v1/outlets')])
      .then(([userData, outletData]) => {
        setUsers(userData.items || []);
        setOutlets(outletData.items || []);
        const manager = (userData.items || []).find((user) => user.role === 'outlet_manager');
        if (manager && outletData.items?.[0]) setGrant({ userId: manager.id, outletId: outletData.items[0].id, canApproveLeave: true });
      })
      .catch((err) => setError(err.message));
  }, [company]);

  async function changePassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/api/v1/auth/change-password', { method: 'POST', body: password });
      const me = await api('/api/v1/auth/me');
      replaceSession(me);
      setMessage('Password updated. Other sessions were signed out.');
      setPassword({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function setRole(userId, role) {
    setError('');
    try {
      await api(`/api/v1/admin/users/${userId}`, { method: 'PATCH', body: { role } });
      const data = await api('/api/v1/admin/users?limit=100');
      setUsers(data.items || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function grantAccess(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/api/v1/admin/outlet-access', { method: 'POST', body: grant });
      setMessage('Outlet access saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>System settings</h1>
        <span>{session.user.email} · {roleLabel(session.user.role)}</span>
      </div>
      {session.user.mustChangePassword && <div className="form-error">Change the temporary password before using the rest of the portal.</div>}
      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-ok">{message}</div>}
      <div className="split forms">
        <form className="panel" onSubmit={changePassword}>
          <h3>Password</h3>
          <label>Current password<input type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} required /></label>
          <label>New password<input type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} minLength={8} required /></label>
          <button className="primary" type="submit">Update password</button>
          <button className="ghost" type="button" onClick={logout}>Sign out</button>
        </form>
        {session.user.role === 'super_admin' && (
          <section className="panel">
            <h3>Roles</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Role</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <select value={user.role} onChange={(event) => setRole(user.id, event.target.value)}>
                          <option value="employee">Employee</option>
                          <option value="outlet_manager">Outlet manager</option>
                          <option value="hr_admin">HR admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {company && (
          <form className="panel" onSubmit={grantAccess}>
            <h3>Outlet access</h3>
            <p className="empty-copy">Grant a manager another outlet. A Noida manager stays inside Noida until HR adds Gurugram here.</p>
            <label>Manager
              <select value={grant.userId} onChange={(event) => setGrant({ ...grant, userId: event.target.value })}>
                {users.filter((user) => user.role === 'outlet_manager').map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
              </select>
            </label>
            <label>Outlet
              <select value={grant.outletId} onChange={(event) => setGrant({ ...grant, outletId: event.target.value })}>
                {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={grant.canApproveLeave} onChange={(event) => setGrant({ ...grant, canApproveLeave: event.target.checked })} /> Can approve leave</label>
            <button className="primary" type="submit">Grant access</button>
          </form>
        )}
      </div>
    </div>
  );
}
