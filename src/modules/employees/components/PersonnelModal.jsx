import { useState } from 'react';
import { API, ASSIGNABLE_ROLES, DESIGNATIONS, PASSWORD, ROLES } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { roleLabel, todayIso } from '../../../shared/format.js';

export function PersonnelModal({ outlets, employees, onClose, onSaved }) {
  const { session } = useAuth();
  const roles = session.user.role === ROLES.superAdmin ? ASSIGNABLE_ROLES : ASSIGNABLE_ROLES.filter((role) => role !== ROLES.superAdmin);
  const managers = employees.filter((person) => person.role === ROLES.outletManager || person.role === ROLES.hrAdmin || person.role === ROLES.superAdmin);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    designation: DESIGNATIONS[0],
    department: '',
    joiningDate: todayIso(),
    outletId: outlets[0]?.id || '',
    role: ROLES.employee,
    reportingManagerId: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, phone: form.phone.replace(/\D/g, '').slice(-10) };
      if (!body.reportingManagerId) delete body.reportingManagerId;
      await api(API.employees, { method: 'POST', body });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <header>
          <h2>Add personnel</h2>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <label>Full name<input value={form.fullName} onChange={(event) => set('fullName', event.target.value)} required /></label>
          <label>Phone<input value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="98XXXXXXXX" inputMode="numeric" required /><small>10-digit Indian mobile starting with 6, 7, 8, or 9.</small></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} required /></label>
          <label>Temporary password<input type="password" value={form.password} onChange={(event) => set('password', event.target.value)} minLength={PASSWORD.minLength} required /><small>At least 8 characters, including a letter and a number.</small></label>
          <label>Designation
            <select value={form.designation} onChange={(event) => set('designation', event.target.value)} required>
              {DESIGNATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Department<input value={form.department} onChange={(event) => set('department', event.target.value)} required /></label>
          <label>Role
            <select value={form.role} onChange={(event) => set('role', event.target.value)} required>
              {roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
          <label>Joining date<input type="date" value={form.joiningDate} onChange={(event) => set('joiningDate', event.target.value)} required /></label>
          <label>Outlet
            <select value={form.outletId} onChange={(event) => set('outletId', event.target.value)} required>
              {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
            </select>
          </label>
          <label>Reporting manager
            <select value={form.reportingManagerId} onChange={(event) => set('reportingManagerId', event.target.value)}>
              <option value="">None</option>
              {managers.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create employee'}</button>
      </form>
    </div>
  );
}
