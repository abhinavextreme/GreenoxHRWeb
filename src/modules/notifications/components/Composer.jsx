import { useState } from 'react';
import { API, NOTICE_AUDIENCE, NOTICE_CATEGORY, NOTICE_TARGET_ROLES } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { roleLabel } from '../../../shared/format.js';

export function Composer({ outlets, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: NOTICE_CATEGORY.announcement,
    audience: NOTICE_AUDIENCE.all,
    outletId: outlets[0]?.id || '',
    targetRole: NOTICE_TARGET_ROLES[0],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function publish(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const body = {
      title: form.title,
      body: form.body,
      category: form.category,
      audience: form.audience,
    };
    if (form.audience === NOTICE_AUDIENCE.outlet) body.outletId = form.outletId;
    if (form.audience === NOTICE_AUDIENCE.role) body.targetRole = form.targetRole;
    try {
      await api(API.announcements, { method: 'POST', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={publish}>
        <header>
          <h3>Publish a notice</h3>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </header>
        {error && <div className="form-error">{error}</div>}
        <div className="choice-row">
          <button type="button" className={form.category === NOTICE_CATEGORY.announcement ? 'chip on' : 'chip'} onClick={() => set('category', NOTICE_CATEGORY.announcement)}>Announcement</button>
          <button type="button" className={form.category === NOTICE_CATEGORY.companyUpdate ? 'chip on' : 'chip'} onClick={() => set('category', NOTICE_CATEGORY.companyUpdate)}>Company notice</button>
        </div>
        <label>Title
          <input value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="Shift change for the weekend" required minLength={3} />
        </label>
        <label>Message
          <textarea className="composer-message" value={form.body} onChange={(event) => set('body', event.target.value)} placeholder="What should people know?" required minLength={3} />
        </label>
        <label>Send to
          <select value={form.audience} onChange={(event) => set('audience', event.target.value)}>
            <option value={NOTICE_AUDIENCE.all}>Everyone</option>
            <option value={NOTICE_AUDIENCE.outlet}>One outlet</option>
            <option value={NOTICE_AUDIENCE.role}>One role</option>
          </select>
        </label>
        {form.audience === NOTICE_AUDIENCE.outlet && (
          <label>Outlet
            <select value={form.outletId} onChange={(event) => set('outletId', event.target.value)} required>
              {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
            </select>
          </label>
        )}
        {form.audience === NOTICE_AUDIENCE.role && (
          <label>Role
            <select value={form.targetRole} onChange={(event) => set('targetRole', event.target.value)}>
              {NOTICE_TARGET_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
        )}
        <button className="primary composer-publish" type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
      </form>
    </div>
  );
}
