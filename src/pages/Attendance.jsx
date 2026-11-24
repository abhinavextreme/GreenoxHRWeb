import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, formatTime, initials, todayIso } from '../api.js';
import { Loader } from '../components/Loader.jsx';

function punchEvents(records) {
  const events = [];
  for (const record of records) {
    if (record.punchInAt) events.push({ id: `${record.id}-in`, at: record.punchInAt, label: 'Punch in' });
    for (const item of record.breaks || []) {
      if (item.breakInAt) events.push({ id: `${item.id}-in`, at: item.breakInAt, label: 'Break in' });
      if (item.breakOutAt) events.push({ id: `${item.id}-out`, at: item.breakOutAt, label: 'Break out' });
    }
    if (record.punchOutAt) events.push({ id: `${record.id}-out`, at: record.punchOutAt, label: 'Punch out' });
  }
  return events.sort((left, right) => left.at.localeCompare(right.at));
}

function punchState(records) {
  if (!records.length) return { label: 'Not Logged in', tone: 'idle' };
  const latest = [...records].sort((left, right) => right.punchInAt.localeCompare(left.punchInAt))[0];
  if (!latest.punchOutAt && latest.openBreak) return { label: 'On break', tone: 'break' };
  if (!latest.punchOutAt) return { label: 'Active', tone: 'duty' };
  return { label: 'Punched out', tone: 'out' };
}

export function AttendancePage() {
  const { outletId, searchQuery } = useOutletContext();
  const submitted = searchQuery.trim();
  const [applied, setApplied] = useState(submitted);
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [people, setPeople] = useState([]);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState({ total: 0, limit: 20, offset: 0 });
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      setApplied(submitted);
      setOffset(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [submitted]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAttendance(quiet) {
      if (!quiet) {
        setLoading(true);
        setError('');
      }
      const peopleQuery = new URLSearchParams({ limit: '20', offset: String(offset), sort: 'name', status: 'active' });
      if (outletId) peopleQuery.set('outletId', outletId);
      if (applied) peopleQuery.set('search', applied);
      const punchesQuery = new URLSearchParams({ from, to, limit: '100', offset: '0' });
      if (outletId) punchesQuery.set('outletId', outletId);
      try {
        const [staff, attendance] = await Promise.all([
          api(`/api/v1/employees?${peopleQuery}`),
          api(`/api/v1/attendance?${punchesQuery}`),
        ]);
        if (cancelled) return;
        setPeople(staff.items || []);
        setPage(staff.page || { total: 0, limit: 20, offset });
        setRecords(attendance.items || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAttendance(false);
    function onFocus() { fetchAttendance(true); }
    function onPush(event) {
      if ((event.detail?.event || 'notices') === 'attendance') fetchAttendance(true);
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('greenox-push', onPush);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('greenox-push', onPush);
    };
  }, [outletId, from, to, applied, offset]);

  const selectedEvents = selected
    ? punchEvents(records.filter((row) => row.employeeId === selected.id))
    : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Attendance & punch</h1>
        <span>Server time, Asia/Kolkata. Punch in and out happens from the employee app.</span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <section className="panel">
        <div className="toolbar">
          <label>From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setOffset(0); }} /></label>
          <label>To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setOffset(0); }} /></label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Outlet</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4"><Loader label="Loading attendance…" /></td></tr>}
              {!loading && people.map((person) => {
                const state = punchState(records.filter((row) => row.employeeId === person.id));
                return (
                  <tr key={person.id}>
                    <td>
                      <div className="person">
                        <span className="avatar">{initials(person.fullName)}</span>
                        <span><strong>{person.fullName}</strong><small>{person.employeeCode} · {person.designation}</small></span>
                      </div>
                    </td>
                    <td>{person.outletName}<small>{person.outletCity}</small></td>
                    <td><span className={`pill ${state.tone}`}>{state.label}</span></td>
                    <td><button type="button" className="ghost" onClick={() => setSelected(person)}>View</button></td>
                  </tr>
                );
              })}
              {!loading && people.length === 0 && <tr><td colSpan="4" className="empty-cell">No employees in this view.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{page.total} people</span>
          <div>
            <button type="button" disabled={loading || page.offset === 0} onClick={() => setOffset(Math.max(0, page.offset - page.limit))}>Previous</button>
            <button type="button" disabled={loading || page.offset + page.limit >= page.total} onClick={() => setOffset(page.offset + page.limit)}>Next</button>
          </div>
        </div>
      </section>
      {selected && (
        <div className="modal-back" onMouseDown={() => setSelected(null)}>
          <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2>{selected.fullName}</h2>
              <button type="button" onClick={() => setSelected(null)}>Close</button>
            </header>
            <p className="meta">{selected.employeeCode} · {from === to ? from : `${from} to ${to}`}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Event</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {selectedEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.label}</td>
                      <td>{formatTime(event.at)}</td>
                    </tr>
                  ))}
                  {selectedEvents.length === 0 && <tr><td colSpan="2" className="empty-cell">No punch or break in this range.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
