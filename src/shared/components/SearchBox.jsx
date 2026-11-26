export function SearchBox({ value, onChange, placeholder, submitLabel, onSubmit, wide = false }) {
  return (
    <form className={wide ? 'search grow' : 'search'} onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
      </svg>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onChange('')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      {submitLabel && <button className="search-go" type="submit">{submitLabel}</button>}
    </form>
  );
}
