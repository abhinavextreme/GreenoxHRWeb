import { useEffect, useState } from 'react';
import { API, EVENTS, PLATFORM, PUSH_PAYLOAD } from '../../../constants/index.js';
import { api } from '../../../shared/api/client.js';
import { Loader } from '../../../shared/components/Loader.jsx';
import { formatTime, todayIso } from '../../../shared/format.js';

export function SelfPunch({ employee, onChanged }) {
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const today = todayIso();
    const data = await api(`${API.attendanceMe}?from=${today}&to=${today}`);
    setMine(data);
  }

  useEffect(() => {
    let stop = false;
    async function pull() {
      if (busy) return;
      try {
        const today = todayIso();
        const data = await api(`${API.attendanceMe}?from=${today}&to=${today}`);
        if (!stop) setMine(data);
      } catch (err) {
        if (!stop) setError(err.message);
      }
    }
    pull();
    function onPush(event) {
      if ((event.detail?.event || PUSH_PAYLOAD.notices) === PUSH_PAYLOAD.attendance) pull();
    }
    window.addEventListener(EVENTS.focus, pull);
    window.addEventListener(EVENTS.push, onPush);
    return () => {
      stop = true;
      window.removeEventListener(EVENTS.focus, pull);
      window.removeEventListener(EVENTS.push, onPush);
    };
  }, [busy]);

  async function act(path) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'POST', body: { source: PLATFORM.web } });
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
        {mine && !open && <button type="button" className="punch-in" disabled={busy} onClick={() => act(API.punchIn)}>{busy ? 'Saving…' : 'Punch in'}</button>}
        {open && <button type="button" className="punch-out" disabled={busy} onClick={() => act(API.punchOut)}>{busy ? 'Saving…' : 'Punch out'}</button>}
        {open && <button type="button" className="break-btn" disabled={busy} onClick={() => act(onBreak ? API.breakOut : API.breakIn)}>{onBreak ? 'Break out' : 'Break in'}</button>}
      </div>
      {error && <div className="form-error">{error}</div>}
    </section>
  );
}
