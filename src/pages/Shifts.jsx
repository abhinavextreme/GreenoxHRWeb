import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, canHr } from '../api.js';
import { useAuth } from '../App.jsx';
import { Loader } from '../components/Loader.jsx';

const CITIES = ['New Delhi', 'Delhi', 'Noida', 'Greater Noida', 'Gurugram', 'Ghaziabad', 'Faridabad'];

export function ShiftsPage() {
  const { session } = useAuth();
  const { outlets, outletId } = useOutletContext();
  const [shifts, setShifts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [outletForm, setOutletForm] = useState({ code: '', name: '', city: 'Noida', address: '', openingTime: '10:00', closingTime: '23:00' });
  const [shiftForm, setShiftForm] = useState({ outletId: '', name: 'Morning', startTime: '10:00', endTime: '16:30', graceMinutes: 10 });

  const visible = outletId ? outlets.filter((item) => item.id === outletId) : outlets;

  async function load() {
    setLoading(true);
    const entries = await Promise.all(visible.map(async (outlet) => {
      const data = await api(`/api/v1/outlets/${outlet.id}/shifts`);
      return [outlet.id, data.items];
    }));
    setShifts(Object.fromEntries(entries));
    if (!shiftForm.outletId && visible[0]) setShiftForm((current) => ({ ...current, outletId: visible[0].id }));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [outletId, outlets.length]);

  async function createOutlet(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/api/v1/outlets', { method: 'POST', body: outletForm });
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createShift(event) {
    event.preventDefault();
    setError('');
    try {
      await api(`/api/v1/outlets/${shiftForm.outletId}/shifts`, {
        method: 'POST',
        body: { name: shiftForm.name, startTime: shiftForm.startTime, endTime: shiftForm.endTime, graceMinutes: Number(shiftForm.graceMinutes) },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Shift rosters</h1>
        <span>Opening hours and the shifts employees punch against.</span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="outlet-grid">
        {loading && <article className="outlet-card"><Loader label="Loading shifts…" /></article>}
        {!loading && visible.map((outlet) => (
          <article className="outlet-card" key={outlet.id}>
            <header><span className="code">{outlet.code}</span><span className="pill green">{outlet.city}</span></header>
            <h2>{outlet.name}</h2>
            <p>{String(outlet.openingTime).slice(0, 5)} – {String(outlet.closingTime).slice(0, 5)}</p>
            <ul className="shift-list">
              {(shifts[outlet.id] || []).map((shift) => (
                <li key={shift.id}><strong>{shift.name}</strong><span>{String(shift.startTime).slice(0, 5)}–{String(shift.endTime).slice(0, 5)} · {shift.graceMinutes} min grace</span></li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      {canHr(session.user.role) && (
        <div className="split forms">
          <form className="panel" onSubmit={createOutlet}>
            <h3>Add outlet</h3>
            <label>Code<input value={outletForm.code} onChange={(event) => setOutletForm({ ...outletForm, code: event.target.value.toUpperCase() })} placeholder="NOIDA-S137" required /></label>
            <label>Name<input value={outletForm.name} onChange={(event) => setOutletForm({ ...outletForm, name: event.target.value })} required /></label>
            <label>City
              <select value={outletForm.city} onChange={(event) => setOutletForm({ ...outletForm, city: event.target.value })}>
                {CITIES.map((city) => <option key={city}>{city}</option>)}
              </select>
            </label>
            <label>Address<input value={outletForm.address} onChange={(event) => setOutletForm({ ...outletForm, address: event.target.value })} required /></label>
            <div className="pair">
              <label>Opens<input type="time" value={outletForm.openingTime} onChange={(event) => setOutletForm({ ...outletForm, openingTime: event.target.value })} /></label>
              <label>Closes<input type="time" value={outletForm.closingTime} onChange={(event) => setOutletForm({ ...outletForm, closingTime: event.target.value })} /></label>
            </div>
            <button className="primary" type="submit">Save outlet</button>
          </form>
          <form className="panel" onSubmit={createShift}>
            <h3>Add shift</h3>
            <label>Outlet
              <select value={shiftForm.outletId} onChange={(event) => setShiftForm({ ...shiftForm, outletId: event.target.value })}>
                {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
              </select>
            </label>
            <label>Name<input value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} required /></label>
            <div className="pair">
              <label>Starts<input type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} /></label>
              <label>Ends<input type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></label>
            </div>
            <label>Grace minutes<input type="number" min="0" max="120" value={shiftForm.graceMinutes} onChange={(event) => setShiftForm({ ...shiftForm, graceMinutes: event.target.value })} /></label>
            <button className="primary" type="submit">Save shift</button>
          </form>
        </div>
      )}
    </div>
  );
}
