import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Badge, Table, Spinner, ErrorBanner, OkBanner, Modal, Field, EmptyState } from '../components/ui';
import BarcodeSvg from '../components/BarcodeSvg';

const blank = { bookCode: '', title: '', author: '', publisher: '', edition: '', category: '', subject: '', language: 'English', isbn: '', keywords: '', publicationYear: '', description: '' };

export default function BooksAdmin() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [copies, setCopies] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const load = useCallback(() => {
    api(`/books?q=${encodeURIComponent(q)}&limit=50`).then((r) => setRows(r.results)).catch(setError);
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setError(null);
    try {
      if (editing?.id) await api(`/books/${editing.id}`, { method: 'PUT', body: form });
      else await api('/books', { method: 'POST', body: form });
      setFlash(editing?.id ? 'Title updated.' : 'Title catalogued.');
      setEditing(null); load();
    } catch (err) { setError(err); }
  };

  const openCopies = (book) => { api(`/books/${book.id}`).then((d) => setCopies({ book: d.book, rows: d.copies })); };
  const addCopies = async () => {
    const n = Number(document.getElementById('cnt').value) || 1;
    const shelf = document.getElementById('shelf').value;
    await api(`/books/${copies.book.id}/copies`, { method: 'POST', body: { count: n, shelfLocation: shelf } });
    openCopies(copies.book); setFlash(`${n} copy(ies) registered.`);
  };

  return (
    <Card title="Books & Copies" actions={<button className="btn small" onClick={() => { setForm(blank); setEditing({}); }}>Catalogue new title</button>}>
      <ErrorBanner error={error} /><OkBanner>{flash}</OkBanner>
      <div style={{ marginBottom: 14, maxWidth: 380 }}><input type="search" placeholder="Search titles / codes…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!rows ? <Spinner /> : rows.length === 0 ? <EmptyState title="No titles" /> : (
        <Table head={['Title', 'Code', 'Author', 'Category', 'Copies', '']} rows={rows} render={(b) => <>
          <td><span className="cell-strong">{b.title}</span><div className="cell-sub">{b.isbn}</div></td>
          <td className="cell-mono">{b.bookCode}</td><td>{b.author}</td>
          <td>{b.category}</td>
          <td className="num">{b.availableCopies}/{b.totalCopies} <div className="cell-sub">available / total</div></td>
          <td><span className="row" style={{ gap: 6 }}>
            <button className="btn ghost small" onClick={() => { setForm(b); setEditing(b); }}>Edit</button>
            <button className="btn ghost small" onClick={() => openCopies(b)}>Copies</button>
          </span></td>
        </>} />
      )}

      <Modal open={!!editing} title={editing?.id ? `Edit ${form.title}` : 'Catalogue new title'} onClose={() => setEditing(null)} wide>
        <form onSubmit={save}>
          <div className="row">
            <Field label="Book Code"><input value={form.bookCode || ''} disabled={!!form.id} placeholder="CSXXX01"
              onChange={(e) => setForm({ ...form, bookCode: e.target.value.toUpperCase() })} required /></Field>
            <Field label="ISBN"><input value={form.isbn || ''} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></Field>
          </div>
          <Field label="Title"><input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <div className="row">
            <Field label="Author"><input value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} required /></Field>
            <Field label="Publisher"><input value={form.publisher || ''} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></Field>
            <Field label="Edition"><input value={form.edition || ''} onChange={(e) => setForm({ ...form, edition: e.target.value })} /></Field>
          </div>
          <div className="row">
            <Field label="Category"><input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Subject"><input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
            <Field label="Language"><input value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></Field>
            <Field label="Year"><input value={form.publicationYear || ''} onChange={(e) => setForm({ ...form, publicationYear: e.target.value })} /></Field>
          </div>
          <Field label="Keywords"><input value={form.keywords || ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></Field>
          <button className="btn" type="submit">{editing?.id ? 'Save' : 'Add to catalogue'}</button>
        </form>
      </Modal>

      <Modal open={!!copies} title={`Copies of “${copies?.book.title}”`} onClose={() => setCopies(null)} wide>
        <div className="row" style={{ marginBottom: 12 }}>
          <Field label="Count"><input id="cnt" type="number" defaultValue={1} min={1} max={50} style={{ width: 80 }} /></Field>
          <Field label="Shelf location"><input id="shelf" placeholder="A1-3" style={{ width: 120 }} /></Field>
          <button className="btn" onClick={addCopies}>Register copies</button>
        </div>
        <Table head={['Barcode', '#', 'Shelf', 'Condition', 'Status']} rows={copies?.rows || []} render={(c) => <>
          <td className="cell-mono">{c.barcode}</td><td className="num">{c.copyNumber}</td>
          <td>{c.shelfLocation || '—'}</td><td>{c.condition}</td>
          <td><Badge status={{ AVAILABLE: 'green', ISSUED: 'blue', RESERVED: 'amber', LOST: 'red', DAMAGED: 'red', MAINTENANCE: 'gray' }[c.status]}>{c.status}</Badge></td>
        </>} />
        {copies?.rows?.[0] && <div style={{ marginTop: 10, maxWidth: 320 }}><BarcodeSvg barcode={copies.rows[0].barcode} /><div className="cell-sub" style={{ textAlign: 'center' }}>Code 128 · print and affix to the physical copy</div></div>}
      </Modal>
    </Card>
  );
}
