import React, { useState } from 'react';
import { api, fmtDay, fmtINR } from '../api';
import { Card, Badge, ErrorBanner, OkBanner, Table } from '../components/ui';
import BarcodeSvg from '../components/BarcodeSvg';

export default function CirculationDesk() {
  const [mode, setMode] = useState('Issue');
  const [memberId, setMemberId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [elig, setElig] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkMember = async (e) => {
    e?.preventDefault();
    setError(null); setElig(null); setReceipt(null); setResult(null);
    if (!memberId.trim()) return;
    try { setElig(await api(`/circulation/eligibility?memberIdentifier=${encodeURIComponent(memberId.trim())}`)); }
    catch (err) { setError(err); }
  };

  const refreshElig = async () => {
    if (!memberId.trim()) return;
    try { setElig(await api(`/circulation/eligibility?memberIdentifier=${encodeURIComponent(memberId.trim())}`)); }
    catch { /* keep the last card while issuing */ }
  };

  const issue = async (e) => {
    e.preventDefault();
    setError(null); setReceipt(null);
    try {
      const r = await api('/circulation/issue', { method: 'POST', body: { memberIdentifier: memberId.trim(), barcode: barcode.trim() } });
      setReceipt(r); setBarcode('');
      refreshElig();
    } catch (err) { setError(err); }
  };

  const doReturn = async (e) => {
    e.preventDefault();
    setError(null); setResult(null);
    try {
      const r = await api('/circulation/return', { method: 'POST', body: { barcode: barcode.trim() } });
      setResult(r); setBarcode('');
    } catch (err) { setError(err); }
  };

  const renew = async (loanId) => {
    setError(null);
    try { await api('/circulation/renew', { method: 'POST', body: { loanId } }); checkMember(); }
    catch (e) { setError(e); }
  };

  return (<>
    <div className="tabs no-print">
      {['Issue', 'Return'].map((m) => <button key={m} className={mode === m ? 'active' : ''} onClick={() => { setMode(m); setError(null); }}>{m}</button>)}
    </div>
    <ErrorBanner error={error} />

    {mode === 'Issue' ? <div className="desk-grid">
      <Card title="Step 1 — Scan member ID">
        <form className="scan-box" onSubmit={checkMember}>
          <input type="text" placeholder="Member barcode or roll number, e.g. LIB-CSE2201 / CSE2201"
            value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label="Member identifier" />
          <button className="btn">Check</button>
        </form>
        {elig && <>
          <div style={{ marginTop: 14 }}>
            <div className={elig.canBorrow ? 'banner banner-ok' : 'banner banner-error'} style={{ marginBottom: 10 }}>
              {elig.canBorrow ? <strong>{elig.member.name} may borrow.</strong>
                : <strong>Cannot issue to {elig.member.name}:</strong>}
              {!elig.canBorrow && <ul>{elig.reasons.map((r) => <li key={r}>{r.replace(/_/g, ' ').toLowerCase()}</li>)}</ul>}
            </div>
            <dl className="kv">
              <dt>Member</dt><dd>{elig.member.name} <span className="mono cell-sub">({elig.member.memberId})</span> · <Badge status={elig.member.role === 'FACULTY' ? 'amber' : 'blue'}>{elig.member.role}</Badge></dd>
              <dt>On loan</dt><dd>{elig.issuedCount} of {elig.limit}</dd>
              <dt>Unpaid dues</dt><dd>{fmtINR(elig.unpaidDues)} (block at {fmtINR(elig.blockThreshold)})</dd>
              <dt>Loan period</dt><dd>{elig.loanDays} days · {elig.renewLimit} renewals allowed</dd>
            </dl>
          </div>
          {elig.activeLoans.length > 0 && <Table head={['Title', 'Due', '']} rows={elig.activeLoans} render={(l) => <>
            <td>{l.bookTitle}</td><td className="mono">{fmtDay(l.dueDate)}</td>
            <td><button className="btn ghost small" onClick={() => renew(l.id)}>Renew</button></td>
          </>} />}
        </>}
      </Card>
      <Card title="Step 2 — Scan book barcode">
        <form className="scan-box" onSubmit={issue}>
          <input type="text" placeholder="LIB-…-NNN" value={barcode} onChange={(e) => setBarcode(e.target.value)}
            aria-label="Book barcode" disabled={!elig} />
          <button className="btn brass" disabled={!elig || !barcode.trim()}>Issue book</button>
        </form>
        {receipt && <div className="receipt" style={{ marginTop: 14 }}>
          <div className="receipt-head"><h3>Loan receipt</h3>
            <span className="receipt-due">Due {fmtDay(receipt.loan.dueDate)}</span></div>
          <dl className="kv">
            <dt>Title</dt><dd className="cell-strong">{receipt.book.title}</dd>
            <dt>Copy barcode</dt><dd className="mono">{receipt.copy.barcode}</dd>
            <dt>Borrower</dt><dd>{receipt.member.name} ({receipt.member.memberId})</dd>
            <dt>Issued on</dt><dd className="mono">{fmtDay(receipt.loan.issueDate)}</dd>
            <dt>Renewals</dt><dd>{receipt.loan.renewalsUsed} used of {elig ? elig.renewLimit : 2}</dd>
          </dl>
          <BarcodeSvg barcode={receipt.copy.barcode} />
          <button className="btn ghost small" style={{ marginTop: 12 }} onClick={() => window.print()}>Print receipt</button>
        </div>}
      </Card>
    </div> :
      <Card title="Return a copy">
        <form className="scan-box" onSubmit={doReturn}>
          <input type="text" placeholder="LIB-…-NNN" value={barcode} onChange={(e) => setBarcode(e.target.value)} aria-label="Book barcode" />
          <button className="btn brass">Return copy</button>
        </form>
        {result && <div className="card" style={{ marginTop: 14, boxShadow: 'none', background: 'var(--surface-2)' }}>
          <p><strong>“{result.book.title}”</strong> returned by {result.member?.name || 'member'}.</p>
          {result.lateDays > 0
            ? <p className="banner banner-warn" style={{ margin: '8px 0' }}>{result.lateDays} day(s) late — penalty {fmtINR(result.penalty?.amount)} recorded.</p>
            : <p className="banner banner-ok" style={{ margin: '8px 0' }}>Returned on time. No penalty.</p>}
          {result.dispatch
            ? <p>Copy dispatched to the next member in the reservation queue <span className="mono">({result.dispatch.memberId})</span> — hold is READY for 48 hours.</p>
            : <p>Copy is back on the shelf (AVAILABLE).</p>}
        </div>}
      </Card>}
  </>);
}
