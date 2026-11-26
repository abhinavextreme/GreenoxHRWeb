import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { API, EVENTS, LIMITS, NOTIFICATION_FILTER, NOTIFICATION_TYPE_LABELS } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { canHr } from '../../../shared/auth/permissions.js';
import { Loader } from '../../../shared/components/Loader.jsx';
import { formatDateTime } from '../../../shared/format.js';
import { Composer } from '../components/Composer.jsx';

export function NotificationsPage() {
  const { session } = useAuth();
  const { outlets, setUnread } = useOutletContext();
  const [filter, setFilter] = useState(NOTIFICATION_FILTER.all);
  const [items, setItems] = useState([]);
  const [unread, setLocalUnread] = useState(0);
  const [openId, setOpenId] = useState('');
  const [composer, setComposer] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hr = canHr(session.user.role);

  async function load(nextFilter = filter, quiet = false) {
    if (!quiet) setLoading(true);
    const query = new URLSearchParams({ limit: String(LIMITS.notifications) });
    if (nextFilter === NOTIFICATION_FILTER.unread) query.set('unreadOnly', 'true');
    const data = await api(`${API.notifications}?${query}`);
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
    window.addEventListener(EVENTS.push, refresh);
    window.addEventListener(EVENTS.focus, refresh);
    return () => {
      stop = true;
      window.removeEventListener(EVENTS.push, refresh);
      window.removeEventListener(EVENTS.focus, refresh);
    };
  }, [filter]);

  async function openItem(item) {
    setOpenId((current) => current === item.id ? '' : item.id);
    if (item.isRead) return;
    try {
      await api(API.readNotification(item.id), { method: 'POST' });
      setItems((current) => current
        .map((row) => row.id === item.id ? { ...row, isRead: true } : row)
        .filter((row) => filter !== NOTIFICATION_FILTER.unread || row.id !== item.id));
      setLocalUnread((count) => Math.max(0, count - 1));
      setUnread((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAll() {
    setError('');
    await api(API.readAllNotifications, { method: 'POST' });
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
        <button type="button" className={filter === NOTIFICATION_FILTER.all ? 'chip on' : 'chip'} onClick={() => setFilter(NOTIFICATION_FILTER.all)}>All</button>
        <button type="button" className={filter === NOTIFICATION_FILTER.unread ? 'chip on' : 'chip'} onClick={() => setFilter(NOTIFICATION_FILTER.unread)}>Unread</button>
      </div>
      <section className="panel inbox">
        {loading && <Loader label="Loading notifications…" />}
        {!loading && items.map((item) => (
          <button type="button" className={item.isRead ? 'inbox-item' : 'inbox-item unread'} key={item.id} onClick={() => openItem(item)}>
            <span className={item.isRead ? 'mark read' : 'mark'} />
            <span className="inbox-copy">
              <span className="inbox-top">
                <strong>{item.title}</strong>
                <em className="pill">{NOTIFICATION_TYPE_LABELS[item.type] || 'Update'}</em>
                <time>{formatDateTime(item.createdAt)}</time>
              </span>
              <p className={openId === item.id ? '' : 'clamp'}>{item.body}</p>
            </span>
          </button>
        ))}
        {!loading && items.length === 0 && <p className="empty-copy">{filter === NOTIFICATION_FILTER.unread ? 'You are caught up.' : 'No notifications yet.'}</p>}
      </section>
      {composer && (
        <Composer outlets={outlets} onClose={() => setComposer(false)} onSaved={() => { setComposer(false); load().catch((err) => setError(err.message)); }} />
      )}
    </div>
  );
}
