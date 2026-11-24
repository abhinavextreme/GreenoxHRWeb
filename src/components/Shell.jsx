import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, canReview, clockLabel, initials, roleLabel } from '../api.js';
import { useAuth } from '../App.jsx';
import { SearchBox } from './SearchBox.jsx';

const NAV = [
  { to: '/', label: 'Operations Dashboard', icon: 'grid', end: true },
  { to: '/employees', label: 'Employee Directory', icon: 'people', badgeKey: 'active' },
  { to: '/attendance', label: 'Attendance & Punch', icon: 'clock' },
  { to: '/leave', label: 'Leave Approvals', icon: 'leave', badgeKey: 'pending' },
  { to: '/shifts', label: 'Shift Rosters', icon: 'roster' },
];

export function Shell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState(localStorage.getItem('greenoxhr.outlet') || '');
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('search') || '');
  const [clock, setClock] = useState(clockLabel());
  const [unread, setUnread] = useState(0);
  const [pending, setPending] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  const [staffVersion, setStaffVersion] = useState(0);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    const timer = setInterval(() => setClock(clockLabel()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api('/api/v1/outlets').then((data) => setOutlets(data.items || [])).catch(() => setOutlets([]));
    api('/health').then((data) => setHealth(data.status === 'ok' ? 'ok' : 'down')).catch(() => setHealth('down'));
  }, []);

  useEffect(() => {
    let stop = false;
    async function refresh() {
      try {
        const data = await api('/api/v1/notifications?limit=1');
        if (!stop) setUnread(data.unreadCount || 0);
      } catch {
        // Keep the last count when a refresh fails.
      }
      if (!canReview(session.user.role)) return;
      try {
        const leave = await api('/api/v1/leave/requests?status=pending&limit=1');
        if (!stop) setPending(leave.page?.total || 0);
      } catch {
        // Keep the last count when a refresh fails.
      }
    }
    refresh();
    window.addEventListener('greenox-push', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      stop = true;
      window.removeEventListener('greenox-push', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [session.user.role]);

  useEffect(() => {
    if (!canReview(session.user.role)) return;
    const staffQuery = new URLSearchParams({ status: 'active', limit: '1' });
    if (outletId) staffQuery.set('outletId', outletId);
    api(`/api/v1/employees?${staffQuery}`)
      .then((data) => setActiveStaff(data.page?.total || 0))
      .catch(() => {});
  }, [session.user.role, outletId, staffVersion]);

  function setSearchQuery(value) {
    setQuery(value);
    const params = new URLSearchParams(location.search);
    if (value.trim()) params.set('search', value.trim());
    else params.delete('search');
    const next = params.toString();
    navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
  }

  function chooseOutlet(value) {
    setOutletId(value);
    localStorage.setItem('greenoxhr.outlet', value);
  }

  const name = session.employee?.fullName || session.user.email;
  const outletName = outlets.find((outlet) => outlet.id === outletId)?.name;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div>
            <strong>Greenox HR</strong>
            <span>Enterprise Cloud</span>
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
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badgeKey === 'active' && activeStaff > 0 && <b className="pill blue">{activeStaff} active</b>}
              {item.badgeKey === 'pending' && pending > 0 && <b className="pill red">{pending} pending</b>}
            </NavLink>
          ))}
        </nav>
        <p className="nav-label">Governance & support</p>
        <nav>
          <NavLink to="/notifications" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Icon name="bell" />
            <span>Notifications</span>
            {unread > 0 && <b className="pill red">{unread}</b>}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Icon name="gear" />
            <span>System Settings</span>
          </NavLink>
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
          <div className="cluster">Delhi-NCR cluster</div>
          <label className="outlet-select">
            <select value={outletId} onChange={(event) => chooseOutlet(event.target.value)}>
              <option value="">All {outlets.length} outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </select>
          </label>
          <SearchBox value={query} onChange={setSearchQuery} placeholder="Search by name, code, or outlet" submitLabel="Search" onSubmit={() => navigate(query.trim() ? `/employees?search=${encodeURIComponent(query.trim())}` : '/employees')} />
          <div className="live">{clock} IST · live records</div>
          <button className="icon-btn" type="button" onClick={() => navigate('/notifications')} aria-label="Notifications">
            <Icon name="bell" />
            {unread > 0 && <i>{unread}</i>}
          </button>
          <button className="user-chip" type="button" onClick={() => navigate('/settings')}>
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

function Icon({ name }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
  if (name === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5S14.4 16 15 19" /><circle cx="17" cy="9" r="2.2" /><path d="M16.2 14.6c2.2.3 3.6 1.6 4.3 4.4" /></svg>;
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></svg>;
  if (name === 'leave') return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  if (name === 'roster') return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>;
  if (name === 'notice') return <svg {...common}><path d="M6 5h12v14H6z" /><path d="M9 9h6M9 13h6" /></svg>;
  if (name === 'gear') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>;
  return <svg {...common}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
}
