import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, canHr, canReview, canSelfPunch, downloadCsv, formatRange, formatTime, initials, todayIso } from '../api.js';
import { useAuth } from '../App.jsx';
import { Loader } from '../components/Loader.jsx';
import { MoveLeave } from '../components/MoveLeave.jsx';
import { PersonnelModal } from '../components/PersonnelModal.jsx';
import { SearchBox } from '../components/SearchBox.jsx';

function SelfPunch({ employee, onChanged }) {
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const today = todayIso();
    const data = await api(`/api/v1/attendance/me?from=${today}&to=${today}`);
    setMine(data);
  }

  useEffect(() => {
    let stop = false;
    async function pull() {
      if (busy) return;
      try {
        const today = todayIso();
        const data = await api(`/api/v1/attendance/me?from=${today}&to=${today}`);
        if (!stop) setMine(data);
      } catch (err) {
        if (!stop) setError(err.message);
      }
    }
    pull();
    function onPush(event) {
      if ((event.detail?.event || 'notices') === 'attendance') pull();
    }
    window.addEventListener('focus', pull);
    window.addEventListener('greenox-push', onPush);
    return () => {
      stop = true;
      window.removeEventListener('focus', pull);
      window.removeEventListener('greenox-push', onPush);
    };
  }, [busy]);

  async function act(path) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'POST', body: { source: 'web' } });
      await refresh();
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const open = mine?.openPunch;
  const onBreak = Boolean(open?.openBreak);
  return (
    <section className="panel punch-card">
      <header className="panel-head">
        <h3>Your punch</h3>
        <span>{employee.fullName} · {employee.outletName}</span>
      </header>
      {!mine && !error && <Loader label="Checking your punch…" />}
      {mine && (
        <p>
          {!open && 'You have not punched in.'}
          {open && onBreak && `On a break since ${formatTime(open.openBreak.breakInAt)}. The server is keeping the time.`}
          {open && !onBreak && `Punched in at ${formatTime(open.punchInAt)}. The server is keeping the time.`}
        </p>
      )}
      <div className="punch-actions">
        {mine && !open && <button type="button" className="punch-in" disabled={busy} onClick={() => act('/api/v1/attendance/punch-in')}>{busy ? 'Saving…' : 'Punch in'}</button>}
        {open && <button type="button" className="punch-out" disabled={busy} onClick={() => act('/api/v1/attendance/punch-out')}>{busy ? 'Saving…' : 'Punch out'}</button>}
        {open && <button type="button" className="break-btn" disabled={busy} onClick={() => act(onBreak ? '/api/v1/attendance/break-out' : '/api/v1/attendance/break-in')}>{onBreak ? 'Break out' : 'Break in'}</button>}
      </div>
      {error && <div className="form-error">{error}</div>}
    </section>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  const { outlets, outletId, setPending, searchQuery, setSearchQuery } = useOutletContext();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [approvedLeave, setApprovedLeave] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [balances, setBalances] = useState({});
  const [searchMatches, setSearchMatches] = useState(null);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('all');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [syncedAt, setSyncedAt] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);
  const today = todayIso();
  const pageSize = 6;

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    const scope = outletId ? `&outletId=${outletId}` : '';
    const [people, punches, pending, approved, shiftLists] = await Promise.all([
      api(`/api/v1/employees?limit=100&sort=name${scope}`),
      api(`/api/v1/attendance?from=${today}&to=${today}&limit=100${scope}`),
      canReview(session.user.role) ? api(`/api/v1/leave/requests?status=pending&limit=6${scope}`) : Promise.resolve({ items: [], page: { total: 0 } }),
      api(`/api/v1/leave/requests?status=approved&from=${today}&to=${today}&limit=100${scope}`).catch(() => ({ items: [] })),
      Promise.all((outletId ? outlets.filter((item) => item.id === outletId) : outlets).map((outlet) => api(`/api/v1/outlets/${outlet.id}/shifts`).then((data) => data.items.map((shift) => ({ ...shift, outletName: outlet.name }))).catch(() => []))),
    ]);
    setEmployees(people.items || []);
    setAttendance(punches.items || []);
    setPendingLeave(pending.items || []);
    setApprovedLeave(approved.items || []);
    setShifts(shiftLists.flat());
    setPending(pending.page?.total || 0);
    setSyncedAt(new Date());
    setLoading(false);
    const nextBalances = {};
    await Promise.all((people.items || []).slice(0, 20).map(async (person) => {
      try {
        const data = await api(`/api/v1/leave/balances/${person.id}`);
        const casual = data.balances?.find((item) => item.code === 'CASUAL') || data.balances?.[0];
        nextBalances[person.id] = casual ? casual.available : null;
      } catch {
        nextBalances[person.id] = null;
      }
    }));
    setBalances(nextBalances);
  }

  useEffect(() => {
    let stop = false;
    let inflight = false;
    setError('');
    function run(quiet) {
      if (inflight) return;
      inflight = true;
      load(quiet).catch((err) => {
        if (stop) return;
        setError(err.message);
        setLoading(false);
      }).finally(() => {
        inflight = false;
      });
    }
    run(false);
    function onFocus() { run(true); }
    function onPush(event) {
      const name = event.detail?.event || 'notices';
      if (name === 'attendance' || name === 'leave') run(true);
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('greenox-push', onPush);
    return () => {
      stop = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('greenox-push', onPush);
    };
  }, [outletId, outlets.length]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchMatches(null);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(() => {
      const query = new URLSearchParams({ limit: '100', sort: 'name', search: term });
      if (outletId) query.set('outletId', outletId);
      api(`/api/v1/employees?${query}`)
        .then((data) => {
          if (!cancelled) setSearchMatches(data.items || []);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, outletId]);

  const punchByEmployee = useMemo(() => {
    const map = new Map();
    attendance.forEach((row) => {
      const current = map.get(row.employeeId);
      if (!current || row.punchInAt > current.punchInAt) map.set(row.employeeId, row);
    });
    return map;
  }, [attendance]);

  const leaveByEmployee = useMemo(() => {
    const map = new Map();
    approvedLeave.forEach((row) => map.set(row.employeeId, row));
    return map;
  }, [approvedLeave]);

  const departments = [...new Set(employees.map((person) => person.department).filter(Boolean))];

  const rosterSource = searchMatches ?? employees;
  const rows = rosterSource.filter((person) => {
    const punch = punchByEmployee.get(person.id);
    const onLeave = leaveByEmployee.has(person.id);
    if (department && person.department !== department) return false;
    if (status === 'duty' && !punch) return false;
    if (status === 'late' && !punch?.isLate) return false;
    if (status === 'leave' && !onLeave) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const onDuty = employees.filter((person) => punchByEmployee.has(person.id)).length;
  const late = attendance.filter((row) => row.isLate).length;
  const onLeave = leaveByEmployee.size;

  const cards = (outletId ? outlets.filter((item) => item.id === outletId) : outlets).map((outlet) => {
    const roster = employees.filter((person) => person.outletId === outlet.id && person.status === 'active');
    const present = roster.filter((person) => punchByEmployee.has(person.id)).length;
    const away = approvedLeave.filter((row) => row.outletId === outlet.id).length;
    const lateHere = attendance.filter((row) => row.outletId === outlet.id && row.isLate).length;
    const manager = employees.find((person) => person.outletId === outlet.id && person.role === 'outlet_manager');
    const compliance = roster.length ? Math.round((present / roster.length) * 100) : 0;
    return { outlet, roster: roster.length, present, away, lateHere, manager, compliance };
  });

  const distribution = shifts.reduce((map, shift) => {
    const key = `${shift.name} (${String(shift.startTime).slice(0, 5)}–${String(shift.endTime).slice(0, 5)})`;
    map.set(key, (map.get(key) || 0) + attendance.filter((row) => row.shiftId === shift.id).length);
    return map;
  }, new Map());

  async function review(id, nextStatus) {
    setBusyId(id);
    try {
      await api('/api/v1/leave/requests/' + id + '/move', { method: 'POST', body: { status: nextStatus } });
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId('');
    }
  }

  function exportRoster() {
    downloadCsv('greenox-hr-roster.csv', [
      ['Employee ID', 'Name', 'Outlet', 'Department', 'Manager', 'Status', 'Punch'],
      ...rows.map((person) => {
        const punch = punchByEmployee.get(person.id);
        return [person.employeeCode, person.fullName, person.outletName, person.department, person.reportingManagerName || '', person.status, punch ? formatTime(punch.punchInAt) : ''];
      }),
    ]);
  }

  const ago = syncedAt ? `${Math.max(0, Math.round((Date.now() - syncedAt.getTime()) / 60000))} min ago` : 'just now';

  return (
    <div className="page">
      <div className="page-head">
        <h1>Regional multi-outlet real-time status</h1>
        <span>Last polled {ago} · <button type="button" className="link" onClick={() => load()}>Refresh</button></span>
      </div>
      {error && <div className="form-error">{error}</div>}
      {canSelfPunch(session) && <SelfPunch employee={session.employee} onChanged={() => load().catch((err) => setError(err.message))} />}
      <section className="outlet-grid">
        {cards.map((card) => (
          <article className="outlet-card" key={card.outlet.id}>
            <header>
              <span className="code">{card.outlet.code}</span>
              <span className="pill green">Normal</span>
            </header>
            <h2>{card.outlet.name}</h2>
            <p>{card.outlet.city} · Mgr {card.manager?.fullName?.split(' ')[0] || 'Unassigned'} · {String(card.outlet.openingTime).slice(0, 5)}–{String(card.outlet.closingTime).slice(0, 5)}</p>
            <div className="strength">
              <span>Punched in today</span>
              <strong>{card.present}</strong>
              <small>of {card.roster} on the roster</small>
            </div>
            <div className="bar"><i style={{ width: `${card.compliance}%` }} /></div>
            <footer>
              <b>{card.compliance}% compliance</b>
              <span>{card.away} on leave · {card.lateHere} late</span>
            </footer>
          </article>
        ))}
        {loading && cards.length === 0 && <article className="outlet-card"><Loader label="Loading outlet status…" /></article>}
        {!loading && cards.length === 0 && <article className="outlet-card empty">No outlets are in your scope.</article>}
      </section>

      <div className="split">
        <section className="panel roster">
          <div className="toolbar">
            <SearchBox wide value={searchQuery} onChange={(value) => { setSearchQuery(value); setPage(1); }} placeholder="Search by name, code, or outlet" />
            <button type="button" className="ghost" onClick={exportRoster}>Export CSV</button>
            {canHr(session.user.role) && <button type="button" className="primary" onClick={() => setAdding(true)}>Add personnel</button>}
          </div>
          <div className="filters">
            <span>Dept</span>
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
              <option value="">All departments</option>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
            {[
              ['all', `All (${rows.length})`],
              ['duty', `On duty (${onDuty})`],
              ['late', `Late (${late})`],
              ['leave', `On leave (${onLeave})`],
            ].map(([key, label]) => (
              <button key={key} type="button" className={status === key ? 'chip on' : 'chip'} onClick={() => { setStatus(key); setPage(1); }}>{label}</button>
            ))}
          </div>
          <p className="meta">Displaying {visible.length} of {rows.length} records</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee & ID</th>
                  <th>Outlet & cluster</th>
                  <th>Department</th>
                  <th>Reporting manager</th>
                  <th>Shift / today’s punch</th>
                  <th>Status</th>
                  <th>Leave bal.</th>
                </tr>
              </thead>
              <tbody>
                {(loading || searching) && <tr><td colSpan="7"><Loader label={searchQuery.trim() ? `Searching “${searchQuery.trim()}”…` : 'Loading the roster…'} /></td></tr>}
                {!loading && !searching && visible.map((person) => {
                  const punch = punchByEmployee.get(person.id);
                  const leave = leaveByEmployee.get(person.id);
                  const tone = leave ? 'leave' : punch?.isLate ? 'late' : punch ? 'duty' : 'idle';
                  return (
                    <tr key={person.id} className={tone}>
                      <td>
                        <div className="person">
                          <span className={`avatar tone-${tone}`}>{initials(person.fullName)}</span>
                          <span>
                            <strong>{person.fullName}</strong>
                            <small>{person.employeeCode}</small>
                          </span>
                        </div>
                      </td>
                      <td>{person.outletName}<small>{person.outletCity}</small></td>
                      <td>{person.department}<small>{person.designation}</small></td>
                      <td>{person.reportingManagerName || '—'}</td>
                      <td>
                        {punch ? `${punch.shiftName || 'Shift'} · ${formatTime(punch.punchInAt)}` : leave ? `${leave.leaveTypeName} · Not punched in today` : 'Not punched in today'}
                        <small>{punch?.punchOutAt ? `Out ${formatTime(punch.punchOutAt)}` : punch ? 'Open shift' : ''}</small>
                      </td>
                      <td><span className={`pill ${tone}`}>{leave ? 'On leave' : punch?.isLate ? 'Late' : punch ? 'On duty' : 'Scheduled'}</span></td>
                      <td>{balances[person.id] ?? '—'}<small>d</small></td>
                    </tr>
                  );
                })}
                {!loading && !searching && visible.length === 0 && <tr><td colSpan="7" className="empty-cell">No employees match this view.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>Showing {(page - 1) * pageSize + (visible.length ? 1 : 0)} to {(page - 1) * pageSize + visible.length} of {rows.length}</span>
            <div>
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <b>{page}</b>
              <button type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        </section>

        <aside className="rail">
          <section className="panel">
            <header className="panel-head">
              <h3>Leave authorizations</h3>
              {pendingLeave.length > 0 && <span className="pill red">{pendingLeave.length} action required</span>}
            </header>
            {pendingLeave.map((item) => (
              <article className="leave-card" key={item.id}>
                <div className="person">
                  <span className="avatar">{initials(item.employeeName)}</span>
                  <span>
                    <strong>{item.employeeName}</strong>
                    <small>{item.outletName}</small>
                  </span>
                  <em className="pill amber">{item.leaveTypeName}</em>
                </div>
                <p>{formatRange(item.startDate, item.endDate)} · {item.days} day{item.days === 1 ? '' : 's'}</p>
                <p className="reason">{item.reason}</p>
                <MoveLeave current="pending" role={session.user.role} busy={busyId === item.id} onMove={(next) => review(item.id, next)} />
              </article>
            ))}
            {pendingLeave.length === 0 && <p className="empty-copy">No leave is waiting for a decision.</p>}
          </section>

          <section className="panel">
            <header className="panel-head">
              <h3>Live punch stream</h3>
              <span className="dot ok" />
            </header>
            {attendance.slice().sort((a, b) => new Date(b.punchInAt) - new Date(a.punchInAt)).slice(0, 5).map((row) => (
              <article className="stream" key={row.id}>
                <span className={`mark ${row.isLate ? 'late' : 'ok'}`} />
                <div>
                  <strong>{row.employeeName}</strong>
                  <small>{row.outletName} · {row.shiftName || 'Unassigned shift'} · {row.isLate ? `${row.lateMinutes} min late` : 'On time'} · {row.punchInSource}</small>
                </div>
                <time>{formatTime(row.punchInAt)}</time>
              </article>
            ))}
            {attendance.length === 0 && <p className="empty-copy">No punches recorded for today in this scope.</p>}
          </section>

          <section className="panel">
            <header className="panel-head"><h3>Today’s shift distribution</h3></header>
            {[...distribution.entries()].map(([label, count]) => (
              <div className="dist" key={label}><span>{label}</span><strong>{count} punched</strong></div>
            ))}
            {distribution.size === 0 && <p className="empty-copy">Shifts appear here once outlets are loaded.</p>}
          </section>
        </aside>
      </div>
      {adding && <PersonnelModal outlets={outlets} employees={employees} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}
