export function punchEvents(records) {
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

export function punchState(records) {
  if (!records.length) return { label: 'Not Logged in', tone: 'idle' };
  const latest = [...records].sort((left, right) => right.punchInAt.localeCompare(left.punchInAt))[0];
  if (!latest.punchOutAt && latest.openBreak) return { label: 'On break', tone: 'break' };
  if (!latest.punchOutAt) return { label: 'Active', tone: 'duty' };
  return { label: 'Punched out', tone: 'out' };
}
