import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, canHr, roleLabel } from '../api.js';
import { useAuth } from '../App.jsx';
import { Loader } from '../components/Loader.jsx';

const TYPES = {
  leave_decision: 'Leave',
  announcement: 'Notice',
  company_update: 'Notice',
};

function when(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function NotificationsPage() {
  const { session } = useAuth();
  const { outlets, setUnread } = useOutletContext();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [unread, setLocalUnread] = useState(0);
  const [openId, setOpenId] = useState('');
  const [composer, setComposer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hr = canHr(session.user.role);

  async function load(nextFilter = filter, quiet = false) {
    if (!quiet) setLoading(true);
    const query = new URLSearchParams({ limit: '50' });
    if (nextFilter === 'unread') query.set('unreadOnly', 'true');
    const data = await api(`/api/v1/notifications?${query}`);
    setItems(data.items || []);
    const count = data.unreadCount || 0;
    setLocalUnread(count);
    setUnread(count);
    setLoading(false);
  }

  useEffect(() => {
    let stop = false;
    function refresh() {
      if (stop) return;
      load(filter, true).catch((err) => {
        if (!stop) setError(err.message);
      });
    }
    load(filter).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
    window.addEventListener('greenox-push', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      stop = true;
      window.removeEventListener('greenox-push', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [filter]);

  async function openItem(item) {
    setOpenId((current) => current === item.id ? '' : item.id);
    if (item.isRead) return;
    try {
      await api(`/api/v1/notifications/${item.id}/read`, { method: 'POST' });
      setItems((current) => current
        .map((row) => row.id === item.id ? { ...row, isRead: true } : row)
        .filter((row) => filter !== 'unread' || row.id !== item.id));
      setLocalUnread((count) => Math.max(0, count - 1));
      setUnread((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAll() {
    setError('');
    await api('/api/v1/notifications/read-all', { method: 'POST' });
    setOpenId('');
    await load();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <span>{unread} unread</span>
        </div>
        <div className="head-actions">
          {unread > 0 && <button type="button" className="ghost" onClick={markAll}>Mark all read</button>}
          {hr && (
            <button type="button" className="plus-btn" aria-label="Add announcement" onClick={() => setComposer(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="filters">
        <button type="button" className={filter === 'all' ? 'chip on' : 'chip'} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'unread' ? 'chip on' : 'chip'} onClick={() => setFilter('unread')}>Unread</button>
      </div>
      <section className="panel inbox">
        {loading && <Loader label="Loading notifications…" />}
        {!loading && items.map((item) => (
          <button type="button" className={item.isRead ? 'inbox-item' : 'inbox-item unread'} key={item.id} onClick={() => openItem(item)}>
            <span className={item.isRead ? 'mark read' : 'mark'} />
            <span className="inbox-copy">
              <span className="inbox-top">
                <strong>{item.title}</strong>
                <em className="pill">{TYPES[item.type] || 'Update'}</em>
                <time>{when(item.createdAt)}</time>
              </span>
              <p className={openId === item.id ? '' : 'clamp'}>{item.body}</p>
            </span>
          </button>
        ))}
        {!loading && items.length === 0 && <p className="empty-copy">{filter === 'unread' ? 'You are caught up.' : 'No notifications yet.'}</p>}
      </section>
      {composer && (
        <Composer outlets={outlets} onClose={() => setComposer(false)} onSaved={() => { setComposer(false); load().catch((err) => setError(err.message)); }} />
      )}
    </div>
  );
}

function Composer({ outlets, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'announcement',
    audience: 'all',
    outletId: outlets[0]?.id || '',
    targetRole: 'employee',
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
    if (form.audience === 'outlet') body.outletId = form.outletId;
    if (form.audience === 'role') body.targetRole = form.targetRole;
    try {
      await api('/api/v1/announcements', { method: 'POST', body });
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
          <button type="button" className={form.category === 'announcement' ? 'chip on' : 'chip'} onClick={() => set('category', 'announcement')}>Announcement</button>
          <button type="button" className={form.category === 'company_update' ? 'chip on' : 'chip'} onClick={() => set('category', 'company_update')}>Company notice</button>
        </div>
        <label>Title
          <input value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="Shift change for the weekend" required minLength={3} />
        </label>
        <label>Message
          <textarea className="composer-message" value={form.body} onChange={(event) => set('body', event.target.value)} placeholder="What should people know?" required minLength={3} />
        </label>
        <label>Send to
          <select value={form.audience} onChange={(event) => set('audience', event.target.value)}>
            <option value="all">Everyone</option>
            <option value="outlet">One outlet</option>
            <option value="role">One role</option>
          </select>
        </label>
        {form.audience === 'outlet' && (
          <label>Outlet
            <select value={form.outletId} onChange={(event) => set('outletId', event.target.value)} required>
              {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
            </select>
          </label>
        )}
        {form.audience === 'role' && (
          <label>Role
            <select value={form.targetRole} onChange={(event) => set('targetRole', event.target.value)}>
              {['employee', 'outlet_manager', 'hr_admin'].map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </label>
        )}
        <button className="primary composer-publish" type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
      </form>
    </div>
  );
}
