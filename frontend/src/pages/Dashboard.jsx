import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, fmtDate, fmtDay, fmtINR } from '../api';
import { Card, Stat, Table, Badge, Spinner, EmptyState, OkBanner, copyTone, loanTone, resTone } from '../components/ui';

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [data, setData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [recos, setRecos] = useState([]);
  const [sweepMsg, setSweepMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const tasks = [];
      if (isStaff) {
        tasks.push(Promise.all([
          api('/reports/summary'), api('/reports/overdue'),
          api('/admin/audit?limit=8').catch(() => [])
        ]).then(([summary, overdue, audit]) => setData({ summary, overdue, audit })));
      } else {
        tasks.push(Promise.all([
          api(`/members/${user.id}/history`), api('/books?limit=100').then((r) => r.results.filter((b) => b.availableCopies === 0))
        ]).then(([history, out]) => setData({ history, outOfStock: out })));
      }
      tasks.push(api('/notifications').then(setNotices).catch(() => []));
      if (!isStaff) tasks.push(api('/recommendations/for-me?limit=4').then(setRecos).catch(() => []));
      await Promise.all(tasks);
    })();
  }, [isStaff, user.id]);

  const sweep = async () => {
    await api('/notifications/scan', { method: 'POST' });
    setSweepMsg('Notification sweep completed — due-soon and overdue alerts refreshed.');
  };

  if (!data) return <Spinner label="Loading workspace…" />;
  const unread = notices.filter((n) => !n.readAt);

  return (<>
    <div className="grid cols-4" style={{ marginBottom: 18 }}>
      {isStaff
        ? ['books', 'copies', 'available', 'activeLoans', 'overdue', 'unpaidDues', 'issuesThisWeek', 'reservationsActive'].map((k) => (
          <Stat key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
            value={k === 'unpaidDues' ? fmtINR(data.summary[k]) : data.summary[k]}
            tone={k === 'overdue' && data.summary.overdue > 0 ? 'warn' : (k === 'available' ? 'ok' : '')} />
        ))
        : <>
          <Stat label="On loan" value={data.history.loans.filter((l) => !l.returnDate).length} />
          <Stat label="Due soon" value={data.history.loans.filter((l) => !l.returnDate && new Date(l.dueDate) - Date.now() < 3 * 864e5 && new Date(l.dueDate) > Date.now()).length} />
          <Stat label="Overdue" tone={data.history.loans.some((l) => !l.returnDate && new Date(l.dueDate) < Date.now()) ? 'warn' : ''}
            value={data.history.loans.filter((l) => !l.returnDate && new Date(l.dueDate) < Date.now()).length} />
          <Stat label="Unpaid fines" value={fmtINR(data.history.penalties.filter((p) => p.status === 'UNPAID').reduce((s, p) => s + p.amount, 0))} />
        </>}
    </div>

    <div className="grid cols-2">
      {isStaff ? <>
        <Card title="Overdue loans" actions={<button className="btn brass small" onClick={sweep}>Run notification sweep</button>}>
          {sweepMsg && <OkBanner>{sweepMsg}</OkBanner>}
          {data.overdue.length === 0 ? <EmptyState title="Nothing overdue" note="Every loan is within its due date." /> : (
            <Table head={['Member', 'Title', 'Due', 'Days late']} rows={data.overdue.slice(0, 6)}
              render={(o) => <>
                <td>{o.memberName}<div className="cell-sub mono">{o.memberCode}</div></td>
                <td>{o.bookTitle}</td><td className="mono">{fmtDay(o.dueDate)}</td>
                <td className="num"><Badge status="red">{o.daysLate}d</Badge></td>
              </>} />
          )}
        </Card>
        <Card title="Recent activity">
          <ul className="notif-list">{data.audit.map((a) => (
            <li key={a.id}><span className="cell-mono">{a.action}</span> {a.entity} <span className="cell-sub">by {a.actorName}</span><span className="when">{fmtDate(a.ts)}</span></li>
          ))}</ul>
        </Card>
      </> : <>
        <Card title="Current loans" actions={<Link className="btn ghost small" to="/my-library">My Library →</Link>}>
          {data.history.loans.filter((l) => !l.returnDate).length === 0 ? <EmptyState title="No books on loan" note="Browse the catalogue to find your next read." /> : (
            <Table head={['Title', 'Due', 'Status']} rows={data.history.loans.filter((l) => !l.returnDate)}
              render={(l) => <>
                <td className="cell-strong">{l.bookTitle}<div className="cell-sub mono">{l.copyBarcode}</div></td>
                <td className="mono">{fmtDay(l.dueDate)}</td><td><Badge status={loanTone(l)}>{new Date(l.dueDate) < new Date() ? 'OVERDUE' : 'ACTIVE'}</Badge></td>
              </>} />
          )}
        </Card>
        <Card title={`Notifications (${unread.length} unread)`}>
          {notices.length === 0 ? <EmptyState title="No notifications" /> : (
            <ul className="notif-list">{notices.slice(0, 8).map((n) => (
              <li key={n.id} className={n.readAt ? '' : 'unread'}>
                <Badge status={n.type === 'OVERDUE' ? 'red' : n.type === 'RESERVATION_READY' ? 'green' : 'blue'}>{n.type.replace('_', ' ')}</Badge>
                <span className="cell-sub">{n.message}</span><span className="when">{fmtDate(n.createdAt)}</span>
              </li>
            ))}</ul>
          )}
        </Card>
        {recos.length > 0 && <Card title="Recommended for you" className="full">
          <div className="reco-strip">{recos.map((r) => (
            <Link key={r.bookId} to={`/catalogue/${r.bookId}`} className="reco">
              <strong>{r.book.title}</strong>
              <div className="cell-sub">{r.book.author}</div>
              <div className="why">{r.reasons[0] ? `Recommended because ${r.reasons[0]}.` : 'Fits your borrowing profile.'}</div>
            </Link>
          ))}</div>
        </Card>}
      </>}
    </div>
  </>);
}
