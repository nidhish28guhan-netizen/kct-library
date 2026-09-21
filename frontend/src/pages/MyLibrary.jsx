import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, fmtDay, fmtINR } from '../api';
import { Card, Badge, Table, Spinner, EmptyState, OkBanner, ErrorBanner, resTone, loanTone } from '../components/ui';

export default function MyLibrary() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Borrowed Books');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = () => api(`/members/${user.id}/history`).then(setData).catch(setError);
  useEffect(() => { load(); }, [user.id]);

  const renew = async (loanId) => {
    setError(null);
    try { await api('/circulation/renew', { method: 'POST', body: { loanId } }); setFlash('Loan renewed.'); load(); }
    catch (e) { setError(e); }
  };
  const cancel = async (rid) => {
    setError(null);
    try { await api(`/reservations/${rid}`, { method: 'DELETE' }); setFlash('Hold request cancelled.'); load(); }
    catch (e) { setError(e); }
  };

  if (!data) return <Spinner />;
  const { loans, reservations, penalties } = data;
  const active = loans.filter((l) => !l.returnDate);
  const past = loans.filter((l) => l.returnDate);

  return (
    <Card title="My Borrowed Books & Holds">
      <ErrorBanner error={error} /><OkBanner>{flash}</OkBanner>
      <div className="tabs" role="tablist">
        {['Borrowed Books', 'Book Holds', 'Fines'].map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Borrowed Books' && <>
        {active.length === 0 && past.length === 0 ? <EmptyState title="No borrowing history" note="Find a book in the catalog to get started." /> : <>
          {active.length > 0 && <Table head={['Title', 'Barcode', 'Issued', 'Due', 'Renewals', 'Status', '']} rows={active}
            render={(l) => <>
              <td className="cell-strong">{l.bookTitle}</td>
              <td className="cell-mono">{l.copyBarcode}</td>
              <td className="mono">{fmtDay(l.issueDate)}</td>
              <td className="mono">{fmtDay(l.dueDate)}</td>
              <td className="num">{l.renewalsUsed}/2</td>
              <td><Badge status={loanTone(l)}>{new Date(l.dueDate) < new Date() ? 'OVERDUE' : 'ACTIVE'}</Badge></td>
              <td><button className="btn ghost small" onClick={() => renew(l.id)}>Renew</button></td>
            </>} />}
          {past.length > 0 && <div style={{ marginTop: 14 }}><Table head={['Title', 'Issued', 'Returned', 'Late days', 'Result']} rows={past.slice(0, 15)}
            render={(l) => <>
              <td>{l.bookTitle}</td><td className="mono">{fmtDay(l.issueDate)}</td><td className="mono">{fmtDay(l.returnDate)}</td>
              <td className="num">{l.lateDays || 0}</td>
              <td>{l.lateDays > 0 ? <Badge status="red">Late</Badge> : <Badge status="green">On time</Badge>}</td>
            </>} /></div>}
        </>}
      </>}

      {tab === 'Book Holds' && (reservations.length === 0 ? <EmptyState title="No active book holds" note="Place a hold when all physical copies are checked out." /> : (
        <Table head={['Title', 'Reserved On', 'Waitlist Position', 'Status', '']} rows={reservations.filter((r) => ['WAITING', 'READY'].includes(r.status))}
          render={(r) => <>
            <td className="cell-strong">{r.bookTitle || <Link to={`/catalogue/${r.bookId}`}>view title</Link>}</td>
            <td className="mono">{fmtDay(r.reservedAt || r.createdAt)}</td>
            <td className="num">{r.position || '—'}</td>
            <td><Badge status={resTone[r.status]}>{r.status}</Badge>{r.status === 'READY' && <div className="cell-sub">Collect within 48 h</div>}</td>
            <td><button className="btn danger small" onClick={() => cancel(r.id)}>Cancel</button></td>
          </>} />
      ))}

      {tab === 'Fines' && (penalties.length === 0 ? <EmptyState title="No fines" note="Keep returning on time." /> : (
        <Table head={['Book', 'Reason', 'Amount', 'Status']} rows={penalties} render={(p) => <>
          <td>{p.bookTitle || '—'}</td>
          <td className="cell-sub">{p.reason}</td>
          <td className="num">{fmtINR(p.amount)}</td>
          <td><Badge status={p.status === 'UNPAID' ? 'red' : 'gray'}>{p.status}</Badge></td>
        </>} />
      ))}
    </Card>
  );
}
