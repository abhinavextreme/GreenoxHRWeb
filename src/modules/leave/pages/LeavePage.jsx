import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { API, EVENTS, LEAVE_STATUS, LEAVE_STATUSES, LIMITS, PUSH_PAYLOAD } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { useAuth } from '../../../shared/auth/AuthProvider.jsx';
import { canHr, canReview } from '../../../shared/auth/permissions.js';
import { Loader } from '../../../shared/components/Loader.jsx';
import { formatRange, initials } from '../../../shared/format.js';
import { MoveLeave } from '../components/MoveLeave.jsx';

export function LeavePage() {
  const { session } = useAuth();
  const { outletId, setPending } = useOutletContext();
  const [status, setStatus] = useState(LEAVE_STATUS.pending);
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    const query = new URLSearchParams({ status, limit: String(LIMITS.leavePage) });
    if (outletId) query.set('outletId', outletId);
    const data = await api(`${API.leaveRequests}?${query}`);
    setItems(data.items || []);
    if (status === LEAVE_STATUS.pending) setPending(data.page?.total || 0);
    setLoading(false);
  }

  useEffect(() => {
    let stop = false;
    function run(quiet) {
      if (quiet && busyId) return;
      load(quiet).catch((err) => {
        if (stop) return;
        setError(err.message);
        setLoading(false);
      });
    }
    run(false);
    function onFocus() { run(true); }
    function onPush(event) {
      if ((event.detail?.event || PUSH_PAYLOAD.notices) === PUSH_PAYLOAD.leave) run(true);
    }
    window.addEventListener(EVENTS.focus, onFocus);
    window.addEventListener(EVENTS.push, onPush);
    return () => {
      stop = true;
      window.removeEventListener(EVENTS.focus, onFocus);
      window.removeEventListener(EVENTS.push, onPush);
    };
  }, [status, outletId, busyId]);

  async function review(id, nextStatus) {
    setBusyId(id);
    setError('');
    try {
      await api(API.moveLeave(id), { method: 'POST', body: note ? { status: nextStatus, reviewNote: note } : { status: nextStatus } });
      setNote('');
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Leave approvals</h1>
        <span>Choose a state and confirm. HR can move a leave to pending, approved, rejected, or cancelled.</span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="filters">
        {LEAVE_STATUSES.map((item) => (
          <button key={item} type="button" className={status === item ? 'chip on' : 'chip'} onClick={() => setStatus(item)}>{item}</button>
        ))}
      </div>
      {(canHr(session.user.role) || (status === LEAVE_STATUS.pending && canReview(session.user.role))) && (
        <label className="note-field">Review note for the next move
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note shown to the employee" />
        </label>
      )}
      <div className="leave-list">
        {loading && <Loader label="Loading leave requests…" />}
        {!loading && items.map((item) => (
          <article className="panel leave-card wide" key={item.id}>
            <div className="person">
              <span className="avatar">{initials(item.employeeName)}</span>
              <span>
                <strong>{item.employeeName}</strong>
                <small>{item.employeeCode} · {item.outletName}</small>
              </span>
              <em className="pill amber">{item.leaveTypeName}</em>
            </div>
            <p>{formatRange(item.startDate, item.endDate)} · {item.days} day{item.days === 1 ? '' : 's'}</p>
            <p className="reason">{item.reason}</p>
            {item.reviewNote && <p className="reason">Note: {item.reviewNote}</p>}
            <MoveLeave current={item.status} role={session.user.role} busy={busyId === item.id} onMove={(next) => review(item.id, next)} />
          </article>
        ))}
        {!loading && items.length === 0 && <p className="empty-copy">Nothing in this queue.</p>}
      </div>
    </div>
  );
}
