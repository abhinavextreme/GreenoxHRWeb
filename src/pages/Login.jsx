import { useState } from 'react';
import { useAuth } from '../App.jsx';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('hr@greenoxhr.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign in failed');
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
        <h1>Regional multi-outlet operations for Delhi-NCR.</h1>
        <p>Attendance, leave, and outlet rosters stay in one place. A Noida manager sees Noida. HR sees the cluster.</p>
        <ul>
          <li>Live floor strength by outlet</li>
          <li>Punch records with server time</li>
          <li>Leave decisions with remaining balance</li>
        </ul>
      </section>
      <section className="login-card">
        <h2>Sign in</h2>
        <p>Use the HR, manager, or employee account issued for this cluster.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Enter portal'}</button>
        </form>
      </section>
    </div>
  );
}
