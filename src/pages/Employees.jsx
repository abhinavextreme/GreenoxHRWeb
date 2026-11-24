import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, canHr, initials, roleLabel } from '../api.js';
import { useAuth } from '../App.jsx';
import { Loader } from '../components/Loader.jsx';
import { PersonnelModal } from '../components/PersonnelModal.jsx';
import { SearchBox } from '../components/SearchBox.jsx';

export function EmployeesPage() {
  const { session } = useAuth();
  const { outlets, outletId, searchQuery, setSearchQuery, refreshActiveStaff } = useOutletContext();
  const submitted = searchQuery.trim();
  const [applied, setApplied] = useState(submitted);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState({ total: 0, limit: 20, offset: 0 });
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
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
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ limit: '20', offset: String(offset), sort: 'name' });
    if (outletId) query.set('outletId', outletId);
    if (status) query.set('status', status);
    if (applied) query.set('search', applied);
    api(`/api/v1/employees?${query}`)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items || []);
        setPage(data.page);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [outletId, status, applied, offset, reloadKey]);

  async function saveStatus(next) {
    await api(`/api/v1/employees/${selected.id}`, { method: 'PATCH', body: { status: next } });
    setSelected({ ...selected, status: next });
    setReloadKey((current) => current + 1);
    refreshActiveStaff();
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Employee directory</h1>
        <span>{page.total} people in this view</span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <section className="panel">
        <div className="toolbar">
          <SearchBox wide value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, code, or outlet" submitLabel="Search" />
          <select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
          </select>
          {canHr(session.user.role) && <button className="primary" type="button" onClick={() => setAdding(true)}>Add personnel</button>}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Outlet</th><th>Department</th><th>Manager</th><th>Phone</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7"><Loader label={applied ? `Searching “${applied}”…` : 'Loading employees…'} /></td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="7" className="empty-cell">{applied ? `No employees match “${applied}”.` : 'No employees in this view.'}</td></tr>}
              {!loading && items.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className="person">
                      <span className="avatar">{initials(person.fullName)}</span>
                      <span><strong>{person.fullName}</strong><small>{person.employeeCode} · {person.designation}</small></span>
                    </div>
                  </td>
                  <td>{person.outletName}<small>{person.outletCity}</small></td>
                  <td>{person.department}</td>
                  <td>{person.reportingManagerName || '—'}</td>
                  <td>{person.phone}</td>
                  <td><span className={`pill ${person.status === 'active' ? 'green' : 'idle'}`}>{person.status}</span></td>
                  <td><button type="button" className="ghost" onClick={() => setSelected(person)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{page.total} records</span>
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
            <dl className="facts">
              <div><dt>Employee ID</dt><dd>{selected.employeeCode}</dd></div>
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Phone</dt><dd>{selected.phone}</dd></div>
              <div><dt>Outlet</dt><dd>{selected.outletName}, {selected.outletCity}</dd></div>
              <div><dt>Department</dt><dd>{selected.department}</dd></div>
              <div><dt>Role</dt><dd>{roleLabel(selected.role)}</dd></div>
              <div><dt>Designation</dt><dd>{selected.designation}</dd></div>
              <div><dt>Joined</dt><dd>{selected.joiningDate}</dd></div>
              <div><dt>Manager</dt><dd>{selected.reportingManagerName || '—'}</dd></div>
            </dl>
            {canHr(session.user.role) && (
              <label>Employment status
                <select value={selected.status} onChange={(event) => saveStatus(event.target.value).catch((err) => setError(err.message))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resigned">Resigned</option>
                </select>
              </label>
            )}
          </section>
        </div>
      )}
      {adding && <PersonnelModal outlets={outlets} employees={items} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setOffset(0); setReloadKey((current) => current + 1); refreshActiveStaff(); }} />}
    </div>
  );
}
