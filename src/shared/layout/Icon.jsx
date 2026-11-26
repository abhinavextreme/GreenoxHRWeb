export function Icon({ name }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
  if (name === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5S14.4 16 15 19" /><circle cx="17" cy="9" r="2.2" /><path d="M16.2 14.6c2.2.3 3.6 1.6 4.3 4.4" /></svg>;
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></svg>;
  if (name === 'leave') return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
  if (name === 'roster') return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>;
  if (name === 'notice') return <svg {...common}><path d="M6 5h12v14H6z" /><path d="M9 9h6M9 13h6" /></svg>;
  if (name === 'gear') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>;
  return <svg {...common}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
}
