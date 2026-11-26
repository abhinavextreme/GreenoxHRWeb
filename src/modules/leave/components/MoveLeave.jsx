import { useState } from 'react';
import { LEAVE_STATUS, LEAVE_STATUS_LABELS, ROLES } from '../../../constants/index.js';

export function moveTargets(role, current) {
  if (role === ROLES.hrAdmin || role === ROLES.superAdmin) {
    return [LEAVE_STATUS.pending, LEAVE_STATUS.approved, LEAVE_STATUS.rejected, LEAVE_STATUS.cancelled].filter((state) => state !== current);
  }
  if (role === ROLES.outletManager && current === LEAVE_STATUS.pending) {
    return [LEAVE_STATUS.approved, LEAVE_STATUS.rejected];
  }
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
          {targets.map((state) => <option key={state} value={state}>{LEAVE_STATUS_LABELS[state]}</option>)}
        </select>
      </label>
      {choice && (
        <div className="move-ask">
          <p>Move this leave to {LEAVE_STATUS_LABELS[choice].toLowerCase()}?</p>
          <button type="button" className="ghost" disabled={busy} onClick={() => setChoice('')}>Keep {LEAVE_STATUS_LABELS[current].toLowerCase()}</button>
          <button type="button" className="primary" disabled={busy} onClick={() => onMove(choice).then(() => setChoice('')).catch(() => {})}>Move to {LEAVE_STATUS_LABELS[choice].toLowerCase()}</button>
        </div>
      )}
    </div>
  );
}
