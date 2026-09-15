import React, { useEffect, useState } from 'react';
import { api, fmtDay, fmtINR } from '../api';
import { Card, Table, Spinner, EmptyState, Stat } from '../components/ui';

export default function Reports() {
  const [d, setD] = useState(null);
  useEffect(() => {
    Promise.all([api('/reports/summary'), api('/reports/overdue'), api('/reports/circulation?days=14'), api('/reports/popular')])
      .then(([summary, overdue, trend, popular]) => setD({ summary, overdue, trend, popular }));
  }, []);
  if (!d) return <Spinner />;
  const max = Math.max(1, ...d.trend.map((t) => Math.max(t.issued, t.returned)));

  return (<>
    <div className="grid cols-4" style={{ marginBottom: 18 }}>
      {Object.entries(d.summary).filter(([k]) => k !== 'unpaidDues').map(([k, v]) => (
        <Stat key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} value={v} />
      ))}
      <Stat label="Unpaid dues" value={fmtINR(d.summary.unpaidDues)} tone={d.summary.unpaidDues > 0 ? 'warn' : ''} />
    </div>
    <div className="grid cols-2">
      <Card title="Overdue loans">
        {d.overdue.length === 0 ? <EmptyState title="No overdue loans" /> : (
          <Table head={['Member', 'Title', 'Due', 'Days late']} rows={d.overdue} render={(o) => <>
            <td>{o.memberName}<div className="cell-sub mono">{o.memberCode}</div></td>
            <td>{o.bookTitle}</td><td className="mono">{fmtDay(o.dueDate)}</td><td className="num">{o.daysLate}</td>
          </>} />)}
      </Card>
      <Card title="Popular titles">
        {d.popular.length === 0 ? <EmptyState title="No circulation history yet" /> : (
          <Table head={['Title', 'Author', 'Issues']} rows={d.popular.slice(0, 8)} render={(b) => <>
            <td className="cell-strong">{b.bookTitle}</td><td>{b.author}</td><td className="num">{b.times}</td>
          </>} />)}
      </Card>
      <Card title="Circulation — last 14 days (issued vs returned)" className="full">
        {d.trend.map((t) => (
          <div className="bar-row" key={t.date}>
            <span className="mono">{t.date.slice(5)}</span>
            <span className="bar"><span style={{ width: `${(t.issued / max) * 100}%` }} />
              <b style={{ width: `${(t.returned / max) * 100}%`, marginTop: -10, opacity: 0.5 }} /></span>
            <span className="cell-mono">{t.issued}·{t.returned}</span>
          </div>
        ))}
        <p className="cell-sub">Green = issues, brass overlay = returns (per day).</p>
      </Card>
    </div>
  </>);
}
