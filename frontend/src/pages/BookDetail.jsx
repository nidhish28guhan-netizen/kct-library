import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, fmtDay, fetchText } from '../api';
import { Card, Badge, Table, Spinner, ErrorBanner, OkBanner, EmptyState, copyTone } from '../components/ui';
import BarcodeSvg from '../components/BarcodeSvg';

export default function BookDetail() {
  const { id } = useParams();
  const { user, isStaff } = useAuth();
  const [data, setData] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = useCallback(() => {
    Promise.all([api(`/books/${id}`), api(`/books/${id}/similar`).catch(() => [])])
      .then(([d, sim]) => { setData(d); setSimilar(sim); })
      .catch(setError);
  }, [id]);
  useEffect(load, [load]);

  const reserve = async () => {
    setError(null);
    try {
      const r = await api('/reservations', { method: 'POST', body: { bookId: id } });
      setFlash(`Reservation placed — you are #${r.position} in the queue.`);
      load();
    } catch (e) { setError(e); }
  };

  const addCopies = async (count) => {
    setError(null);
    try {
      const created = await api(`/books/${id}/copies`, { method: 'POST', body: { count } });
      setFlash(`${created.length} copy(ies) registered with barcodes.`);
      setCopied(created[0].barcode);
      load();
    } catch (e) { setError(e); }
  };

  if (!data) return <Spinner />;
  const { book, copies } = data;
  const noneAvailable = copies.filter((c) => c.status === 'AVAILABLE').length === 0;
  const myOpen = null;

  return (<>
    <div className="breadcrumb"><Link to="/catalogue">Catalogue</Link> / {book.title}</div>
    <ErrorBanner error={error} /><OkBanner>{flash}</OkBanner>
    <div className="grid cols-2">
      <Card title={book.title}>
        <dl className="kv">
          <dt>Author</dt><dd>{book.author}</dd>
          <dt>ISBN</dt><dd className="mono">{book.isbn || '—'}</dd>
          <dt>Book Code</dt><dd className="mono">{book.bookCode}</dd>
          <dt>Publisher</dt><dd>{book.publisher || '—'} · {book.edition || '—'}</dd>
          <dt>Category</dt><dd>{book.category} — {book.subject}</dd>
          <dt>Language</dt><dd>{book.language}</dd>
          <dt>Keywords</dt><dd>{book.keywords || '—'}</dd>
        </dl>
        {book.description && <p className="cell-sub">{book.description}</p>}
        {!isStaff && noneAvailable && <button className="btn brass" onClick={reserve}>Reserve this title</button>}
      </Card>
      <Card title={`Physical copies (${copies.length})`}>
        <Table head={['Barcode', 'Shelf', 'Condition', 'Status']} rows={copies} render={(c) => <>
          <td className="cell-mono">{c.barcode}</td>
          <td>{c.shelfLocation || '—'}</td>
          <td>{c.condition}</td>
          <td><Badge status={copyTone[c.status]}>{c.status}</Badge></td>
        </>} />
      </Card>
      {isStaff && <Card title="Register new copies" actions={
        <span className="row" style={{ gap: 8 }}>
          <input type="number" id="addcount" defaultValue={1} min={1} max={50} style={{ width: 70 }} />
          <button className="btn small" onClick={() => addCopies(Number(document.getElementById('addcount').value))}>Add copies</button>
        </span>}>
        <p className="cell-sub">Barcodes are generated automatically in the form <code>LIB-{book.bookCode}-NNN</code> (Code 128).
          Duplicate identifiers are rejected before saving.</p>
        {copied && <div style={{ maxWidth: 340 }}><BarcodeSvg barcode={copied} /></div>}
      </Card>}
      <Card title="Readers of this title also borrowed">
        {similar.length === 0 ? <EmptyState title="No related titles yet" note="Suggestions appear once borrowing history accumulates." /> : (
          <ul className="notif-list">{similar.map(({ book: s }) => (
            <li key={s.id}><Link to={`/catalogue/${s.id}`}>{s.title}</Link><span className="cell-sub">{s.author}</span>
              <span className="when">{s.subject}</span></li>
          ))}</ul>
        )}
      </Card>
    </div>
  </>);
}
