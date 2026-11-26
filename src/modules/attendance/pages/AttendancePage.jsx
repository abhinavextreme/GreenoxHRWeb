import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { API, APP, EMPLOYMENT_STATUS, EVENTS, LIMITS, PUSH_PAYLOAD, TIMING } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { Loader } from '../../../shared/components/Loader.jsx';
import { formatTime, initials, todayIso } from '../../../shared/format.js';
import { punchEvents, punchState } from '../punch.js';

export function AttendancePage() {
  const { outletId, searchQuery } = useOutletContext();
  const submitted = searchQuery.trim();
  const [applied, setApplied] = useState(submitted);
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [people, setPeople] = useState([]);
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState({ total: 0, limit: LIMITS.attendancePeople, offset: 0 });
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      setApplied(submitted);
      setOffset(0);
    }, TIMING.searchDebounceMs);
    return () => clearTimeout(handle);
  }, [submitted]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAttendance(quiet) {
      if (!quiet) {
        setLoading(true);
        setError('');
      }
      const peopleQuery = new URLSearchParams({ limit: String(LIMITS.attendancePeople), offset: String(offset), sort: 'name', status: EMPLOYMENT_STATUS.active });
      if (outletId) peopleQuery.set('outletId', outletId);
      if (applied) peopleQuery.set('search', applied);
      const punchesQuery = new URLSearchParams({ from, to, limit: String(LIMITS.attendanceRecords), offset: '0' });
      if (outletId) punchesQuery.set('outletId', outletId);
      try {
        const [staff, attendance] = await Promise.all([
          api(`${API.employees}?${peopleQuery}`),
          api(`${API.attendance}?${punchesQuery}`),
        ]);
        if (cancelled) return;
        setPeople(staff.items || []);
        setPage(staff.page || { total: 0, limit: LIMITS.attendancePeople, offset });
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
      if ((event.detail?.event || PUSH_PAYLOAD.notices) === PUSH_PAYLOAD.attendance) fetchAttendance(true);
    }
    window.addEventListener(EVENTS.focus, onFocus);
    window.addEventListener(EVENTS.push, onPush);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENTS.focus, onFocus);
      window.removeEventListener(EVENTS.push, onPush);
    };
  }, [outletId, from, to, applied, offset]);

  const selectedEvents = selected
    ? punchEvents(records.filter((row) => row.employeeId === selected.id))
    : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Attendance & punch</h1>
        <span>Server time, {APP.timeZone}. Punch in and out happens from the employee app.</span>
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
