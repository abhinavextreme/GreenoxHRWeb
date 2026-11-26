import { useState } from 'react';
import { API, APP, PASSWORD } from '../../../constants/index.js';
import { api, saveTokens } from '../../../shared/api/client.js';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';

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
    if (newPassword.length < PASSWORD.minLength || !PASSWORD.letter.test(newPassword) || !PASSWORD.number.test(newPassword)) {
      setError('Use at least 8 characters, with a letter and a number.');
      return;
    }
    setBusy(true);
    try {
      const data = await api(API.changePassword, {
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
            <strong>{APP.name}</strong>
            <span>{APP.tagline}</span>
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
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD.minLength} required />
          </label>
          <label>
            Confirm new password
            <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" autoComplete="new-password" minLength={PASSWORD.minLength} required />
          </label>
          <p className="hint">{PASSWORD.hint}</p>
          {error && <div className="form-error">{error}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
          <button className="ghost" type="button" onClick={logout}>Sign out</button>
        </form>
      </section>
    </div>
  );
}
