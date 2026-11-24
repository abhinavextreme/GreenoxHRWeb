import { useState } from 'react';

const LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function moveTargets(role, current) {
  const states = ['pending', 'approved', 'rejected', 'cancelled'];
  if (role === 'hr_admin' || role === 'super_admin') return states.filter((state) => state !== current);
  if (role === 'outlet_manager' && current === 'pending') return ['approved', 'rejected'];
  return [];
}

export function MoveLeave({ current, role, busy, onMove }) {
  const targets = moveTargets(role, current);
  const [choice, setChoice] = useState('');
  if (targets.length === 0) return null;
  return (
    <div className="move-leave">
      <label>Move to
        <select value={choice} onChange={(event) => setChoice(event.target.value)} disabled={busy}>
          <option value="">Choose a state</option>
          {targets.map((state) => <option key={state} value={state}>{LABELS[state]}</option>)}
        </select>
      </label>
      {choice && (
        <div className="move-ask">
          <p>Move this leave to {LABELS[choice].toLowerCase()}?</p>
          <button type="button" className="ghost" disabled={busy} onClick={() => setChoice('')}>Keep {LABELS[current].toLowerCase()}</button>
          <button type="button" className="primary" disabled={busy} onClick={() => onMove(choice).then(() => setChoice('')).catch(() => {})}>Move to {LABELS[choice].toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}
