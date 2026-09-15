import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Spinner, ErrorBanner, OkBanner, Field } from '../components/ui';

export default function Policies() {
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => { api('/admin/policies').then(setP).catch(setError); }, []);
  if (!p) return <Spinner />;

  const set = (section, key, val) => setP({ ...p, [section]: { ...p[section], [key]: Number(val) } });

  const save = async () => {
    setError(null);
    try { const saved = await api('/admin/policies', { method: 'PUT', body: p }); setP(saved); setFlash('Policy updated — applies to all future transactions.'); }
    catch (e) { setError(e); }
  };

  return (<>
    <ErrorBanner error={error} /><OkBanner>{flash}</OkBanner>
    <div className="grid cols-2">
      <Card title="Students">
        <div className="row">
          <Field label="Loan period (days)"><input type="number" value={p.roles.STUDENT.loanDays} onChange={(e) => setP({ ...p, roles: { ...p.roles, STUDENT: { ...p.roles.STUDENT, loanDays: Number(e.target.value) } } })} /></Field>
          <Field label="Max books"><input type="number" value={p.roles.STUDENT.maxBooks} onChange={(e) => setP({ ...p, roles: { ...p.roles, STUDENT: { ...p.roles.STUDENT, maxBooks: Number(e.target.value) } } })} /></Field>
          <Field label="Max reservations"><input type="number" value={p.roles.STUDENT.maxReservations} onChange={(e) => setP({ ...p, roles: { ...p.roles, STUDENT: { ...p.roles.STUDENT, maxReservations: Number(e.target.value) } } })} /></Field>
        </div>
      </Card>
      <Card title="Faculty">
        <div className="row">
          <Field label="Loan period (days)"><input type="number" value={p.roles.FACULTY.loanDays} onChange={(e) => setP({ ...p, roles: { ...p.roles, FACULTY: { ...p.roles.FACULTY, loanDays: Number(e.target.value) } } })} /></Field>
          <Field label="Max books"><input type="number" value={p.roles.FACULTY.maxBooks} onChange={(e) => setP({ ...p, roles: { ...p.roles, FACULTY: { ...p.roles.FACULTY, maxBooks: Number(e.target.value) } } })} /></Field>
          <Field label="Max reservations"><input type="number" value={p.roles.FACULTY.maxReservations} onChange={(e) => setP({ ...p, roles: { ...p.roles, FACULTY: { ...p.roles.FACULTY, maxReservations: Number(e.target.value) } } })} /></Field>
        </div>
      </Card>
    </div>
    <Card title="Global rules">
      <div className="row">
        <Field label="Fine per late day (₹)"><input type="number" step="0.5" value={p.global.finePerDay} onChange={(e) => setP({ ...p, global: { ...p.global, finePerDay: Number(e.target.value) } })} /></Field>
        <Field label="Borrow-block threshold (₹)"><input type="number" value={p.global.blockThreshold} onChange={(e) => setP({ ...p, global: { ...p.global, blockThreshold: Number(e.target.value) } })} /></Field>
        <Field label="Renewal limit per loan"><input type="number" value={p.global.renewLimit} onChange={(e) => setP({ ...p, global: { ...p.global, renewLimit: Number(e.target.value) } })} /></Field>
        <Field label="Hold window (hours)"><input type="number" value={p.global.holdDays} onChange={(e) => setP({ ...p, global: { ...p.global, holdDays: Number(e.target.value) } })} /></Field>
        <Field label="Due-soon alert (days)"><input type="number" value={p.global.dueSoonDays} onChange={(e) => setP({ ...p, global: { ...p.global, dueSoonDays: Number(e.target.value) } })} /></Field>
        <Field label="Queue limit per title"><input type="number" value={p.global.queueLimit} onChange={(e) => setP({ ...p, global: { ...p.global, queueLimit: Number(e.target.value) } })} /></Field>
      </div>
      <button className="btn" onClick={save}>Save policy</button>
    </Card>
  </>);
}
