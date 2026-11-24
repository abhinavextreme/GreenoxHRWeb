import { useState } from 'react';
import { api, saveTokens } from '../api.js';
import { useAuth } from '../App.jsx';

export function PasswordPage() {
  const { replaceSession, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Use at least 8 characters, with a letter and a number.');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      saveTokens(data.accessToken, data.refreshToken);
      replaceSession({ user: data.user, employee: data.employee, outletAccess: data.outletAccess });
    } catch (err) {
      setError(err.message || 'Could not update the password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="brand light">
          <div className="brand-mark">G</div>
          <div>
            <strong>Greenox HR</strong>
            <span>Enterprise Cloud</span>
          </div>
        </div>
        <h1>Choose a password that replaces the temporary one.</h1>
        <p>Attendance, leave, and the directory stay locked until this account has its own password.</p>
      </section>
      <section className="login-card">
        <h2>New password</h2>
        <p>Use the temporary password from HR, then choose a new one.</p>
        <form onSubmit={submit}>
          <label>
            Temporary password
            <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          <label>
            New password
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Confirm new password
            <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <p className="hint">At least 8 characters, with a letter and a number.</p>
          {error && <div className="form-error">{error}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
          <button className="ghost" type="button" onClick={logout}>Sign out</button>
        </form>
      </section>
    </div>
  );
}
