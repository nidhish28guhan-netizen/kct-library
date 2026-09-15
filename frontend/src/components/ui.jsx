import React from 'react';

export function Badge({ status = 'gray', children }) {
  return <span className={`badge badge-${status}`}>{children || status}</span>;
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <h2>{title}</h2>
          <div className="card-actions">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = '', sub }) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Something went wrong';
  const details = error && error.details && Array.isArray(error.details) ? error.details : null;
  return (
    <div className="banner banner-error" role="alert">
      <strong>{msg}</strong>
      {details && <ul>{details.map((d, i) => <li key={i}>{d}</li>)}</ul>}
    </div>
  );
}

export function OkBanner({ children }) {
  if (!children) return null;
  return <div className="banner banner-ok">{children}</div>;
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner" aria-live="polite"><span className="spinner-dot" /> {label}</div>;
}

export function EmptyState({ title = 'Nothing here yet', note }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {note && <p className="empty-note">{note}</p>}
    </div>
  );
}

export function Table({ head, rows, render }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.id || i}>{render(r, i)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span>Page {page} of {pages} · {total} results</span>
      <button className="btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </nav>
  );
}

export const copyTone = { AVAILABLE: 'green', ISSUED: 'blue', RESERVED: 'amber', LOST: 'red', DAMAGED: 'red', MAINTENANCE: 'gray' };
export const memberTone = { ACTIVE: 'green', SUSPENDED: 'amber', BLACKLISTED: 'red' };
export const resTone = { WAITING: 'blue', READY: 'green', COMPLETED: 'gray', CANCELLED: 'gray', EXPIRED: 'red' };
export const loanTone = (loan) => (loan.returnDate ? 'gray' : (new Date(loan.dueDate) < new Date() ? 'red' : 'blue'));
export const roleTone = { STUDENT: 'blue', FACULTY: 'amber', LIBRARIAN: 'green', ADMIN: 'red' };
