import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { API, APP, EMPLOYMENT_STATUS, EVENTS, LIMITS, PRIMARY_NAV, ROUTES, SEARCH_PARAM, SECONDARY_NAV, STORAGE, TIMING } from '../../constants/index.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { api } from '../api/client.js';
import { canReview } from '../auth/permissions.js';
import { SearchBox } from '../components/SearchBox.jsx';
import { clockLabel, initials, roleLabel } from '../format.js';
import { Icon } from './Icon.jsx';

export function Shell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState(localStorage.getItem(STORAGE.outlet) || '');
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get(SEARCH_PARAM) || '');
  const [clock, setClock] = useState(clockLabel());
  const [unread, setUnread] = useState(0);
  const [pending, setPending] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  const [staffVersion, setStaffVersion] = useState(0);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    const timer = setInterval(() => setClock(clockLabel()), TIMING.clockTickMs);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api(API.outlets).then((data) => setOutlets(data.items || [])).catch(() => setOutlets([]));
    api(API.health).then((data) => setHealth(data.status === 'ok' ? 'ok' : 'down')).catch(() => setHealth('down'));
  }, []);

  useEffect(() => {
    let stop = false;
    async function refresh() {
      try {
        const data = await api(`${API.notifications}?limit=${LIMITS.badge}`);
        if (!stop) setUnread(data.unreadCount || 0);
      } catch {
        // Keep the last count when a refresh fails.
      }
      if (!canReview(session.user.role)) return;
      try {
        const leave = await api(`${API.leaveRequests}?status=pending&limit=${LIMITS.badge}`);
        if (!stop) setPending(leave.page?.total || 0);
      } catch {
        // Keep the last count when a refresh fails.
      }
    }
    refresh();
    window.addEventListener(EVENTS.push, refresh);
    window.addEventListener(EVENTS.focus, refresh);
    return () => {
      stop = true;
      window.removeEventListener(EVENTS.push, refresh);
      window.removeEventListener(EVENTS.focus, refresh);
    };
  }, [session.user.role]);

  useEffect(() => {
    if (!canReview(session.user.role)) return;
    const staffQuery = new URLSearchParams({ status: EMPLOYMENT_STATUS.active, limit: String(LIMITS.badge) });
    if (outletId) staffQuery.set('outletId', outletId);
    api(`${API.employees}?${staffQuery}`)
      .then((data) => setActiveStaff(data.page?.total || 0))
      .catch(() => {});
  }, [session.user.role, outletId, staffVersion]);

  function setSearchQuery(value) {
    setQuery(value);
    const params = new URLSearchParams(location.search);
    if (value.trim()) params.set(SEARCH_PARAM, value.trim());
    else params.delete(SEARCH_PARAM);
    const next = params.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }

  function chooseOutlet(value) {
    setOutletId(value);
    localStorage.setItem(STORAGE.outlet, value);
  }

  function badge(key) {
    if (key === 'active' && activeStaff > 0) return <b className="pill blue">{activeStaff} active</b>;
    if (key === 'pending' && pending > 0) return <b className="pill red">{pending} pending</b>;
    if (key === 'unread' && unread > 0) return <b className="pill red">{unread}</b>;
    return null;
  }

  const name = session.employee?.fullName || session.user.email;
  const outletName = outlets.find((outlet) => outlet.id === outletId)?.name;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>{APP.name}</strong>
            <span>{APP.tagline}</span>
          </div>
        </div>
        <div className="who">
          <span className="avatar">{initials(name)}</span>
          <div>
            <strong>{name}</strong>
            <small>{roleLabel(session.user.role)}</small>
            <em>{outlets.length} outlet{outlets.length === 1 ? '' : 's'} in scope</em>
          </div>
        </div>
        <p className="nav-label">Core operations</p>
        <nav>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {badge(item.badgeKey)}
            </NavLink>
          ))}
        </nav>
        <p className="nav-label">Governance & support</p>
        <nav>
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {badge(item.badgeKey)}
            </NavLink>
          ))}
        </nav>
        <div className="gateway">
          <span className={health === 'ok' ? 'dot ok' : 'dot'} />
          <div>
            <strong>HR API gateway</strong>
            <small>{health === 'ok' ? 'Delhi server connected' : health === 'checking' ? 'Checking…' : 'API unreachable'}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="cluster">{APP.cluster}</div>
          <label className="outlet-select">
            <select value={outletId} onChange={(event) => chooseOutlet(event.target.value)}>
              <option value="">All {outlets.length} outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </select>
          </label>
          <SearchBox value={query} onChange={setSearchQuery} placeholder="Search by name, code, or outlet" submitLabel="Search" onSubmit={() => navigate(query.trim() ? `${ROUTES.employees}?${SEARCH_PARAM}=${encodeURIComponent(query.trim())}` : ROUTES.employees)} />
          <div className="live">{clock} IST · live records</div>
          <button className="icon-btn" type="button" onClick={() => navigate(ROUTES.notifications)} aria-label="Notifications">
            <Icon name="bell" />
            {unread > 0 && <i>{unread}</i>}
          </button>
          <button className="user-chip" type="button" onClick={() => navigate(ROUTES.settings)}>
            <span className="avatar sm">{initials(name)}</span>
            <span>
              <strong>{name.split(' ')[0]}</strong>
              <small>{roleLabel(session.user.role)}</small>
            </span>
          </button>
          <button className="text-btn" type="button" onClick={logout}>Sign out</button>
        </header>
        <main>
          <Outlet context={{ outlets, outletId, outletName, setUnread, setPending, setActiveStaff, refreshActiveStaff: () => setStaffVersion((current) => current + 1), searchQuery: query, setSearchQuery }} />
        </main>
      </div>
    </div>
  );
}
