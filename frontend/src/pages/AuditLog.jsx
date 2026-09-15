import React, { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api';
import { Card, Badge, Table, Spinner } from '../components/ui';

const tone = (action) => (/CREATE|LOGIN/.test(action) ? 'blue' : /CANCEL|DELETE|BLOCK/.test(action) ? 'red' : /RETURN|CLEAR|ACTIVE/.test(action) ? 'green' : 'gray');

export default function AuditLog() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const load = useCallback(() => {
    api(`/admin/audit?q=${encodeURIComponent(q)}&limit=200`).then(setRows).catch(() => setRows([]));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <Card title="Audit Log" actions={<span className="cell-sub">{rows ? `${rows.length} entries` : ''}</span>}>
      <div style={{ maxWidth: 380, marginBottom: 14 }}>
        <input type="search" placeholder="Filter by actor, action, entity…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!rows ? <Spinner /> : (
        <Table head={['When', 'Actor', 'Action', 'Entity', 'Detail']} rows={rows} render={(a) => <>
          <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(a.ts)}</td>
          <td>{a.actorName}</td>
          <td><Badge status={tone(a.action)}>{a.action}</Badge></td>
          <td className="cell-mono">{a.entity} <span className="cell-sub">{a.entityId || ''}</span></td>
          <td className="cell-sub" style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.after ? JSON.stringify(a.after) : a.before ? JSON.stringify(a.before) : '—'}
          </td>
        </>} />
      )}
    </Card>
  );
}
