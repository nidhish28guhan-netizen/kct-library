import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api, fmtDay } from '../api';
import { Card, Badge, Table, Spinner, ErrorBanner, OkBanner, Modal, Field, memberTone } from '../components/ui';

const blank = { name: '', role: 'STUDENT', memberId: '', dept: '', year: '', email: '' };

export default function Members() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = useCallback(() => {
    setRows(null);
    api(`/members?q=${encodeURIComponent(q)}&role=${role}&status=${status}`).then(setRows).catch(setError);
  }, [q, role, status]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const save = async (e) => {
    e.preventDefault(); setError(null);
    try {
      if (editing?.id) await api(`/members/${editing.id}`, { method: 'PUT', body: form });
      else await api('/members', { method: 'POST', body: form });
      setFlash(editing?.id ? 'Member updated.' : 'Member registered. Initial password: College@123');
      setEditing(null); load();
    } catch (err) { setError(err); }
  };

  const changeStatus = async (m, to) => {
    setError(null);
    try { await api(`/members/${m.id}/status`, { method: 'PATCH', body: { status: to } }); setFlash(`${m.name} → ${to}`); load(); }
    catch (err) { setError(err); }
  };

  const resetPw = async (m) => {
    await api(`/members/${m.id}/reset-password`, { method: 'POST', body: { password: 'College@123' } });
    setFlash(`Password for ${m.name} reset to the initial password.`);
  };

  return (
    <Card title="Members" actions={<button className="btn small" onClick={() => { setForm(blank); setEditing({}); }}>Register member</button>}>
      <ErrorBanner error={error} /><OkBanner>{flash}</OkBanner>
      <div className="row" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}><input type="search" placeholder="Search name, roll number, department…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 140 }}>
          <option value="">All roles</option><option>STUDENT</option><option>FACULTY</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option><option>BLACKLISTED</option>
        </select>
      </div>
      {!rows ? <Spinner /> : (
        <Table head={['Member', 'Role', 'Dept', 'Barcode', 'Joined', 'Status', 'Actions']} rows={rows} render={(m) => <>
          <td><span className="cell-strong">{m.name}</span><div className="cell-sub mono">{m.memberId}</div></td>
          <td><Badge status={m.role === 'FACULTY' ? 'amber' : 'blue'}>{m.role}</Badge></td>
          <td>{m.dept || '—'}{m.year ? ` · ${m.year}` : ''}</td>
          <td className="cell-mono">{m.barcode}</td>
          <td className="mono">{fmtDay(m.createdAt)}</td>
          <td><Badge status={memberTone[m.status]}>{m.status}</Badge></td>
          <td>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn ghost small" onClick={() => { setForm(m); setEditing(m); }}>Edit</button>
              <button className="btn ghost small" onClick={() => resetPw(m)}>Reset pw</button>
              {isAdmin && m.status === 'ACTIVE' && <button className="btn danger small" onClick={() => changeStatus(m, 'SUSPENDED')}>Suspend</button>}
              {isAdmin && m.status !== 'ACTIVE' && <button className="btn small" onClick={() => changeStatus(m, 'ACTIVE')}>Reactivate</button>}
            </span>
          </td>
        </>} />
      )}
      <Modal open={!!editing} title={editing?.id ? `Edit ${form.name || 'member'}` : 'Register new member'} onClose={() => setEditing(null)}>
        <form onSubmit={save}>
          <Field label="Full name"><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="row">
            <Field label="Role"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>STUDENT</option><option>FACULTY</option></select></Field>
            <Field label="Roll / staff ID"><input value={form.memberId || ''} disabled={!!form.id} placeholder="CSE2201"
              onChange={(e) => setForm({ ...form, memberId: e.target.value.toUpperCase() })} required /></Field>
          </div>
          <div className="row">
            <Field label="Department"><input value={form.dept || ''} onChange={(e) => setForm({ ...form, dept: e.target.value })} /></Field>
            <Field label="Year"><input value={form.year || ''} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
          </div>
          <Field label="Email"><input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <button className="btn" type="submit">{editing?.id ? 'Save changes' : 'Register'}</button>
        </form>
      </Modal>
    </Card>
  );
}
