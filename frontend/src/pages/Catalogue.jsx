import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card, Badge, Spinner, EmptyState, Pagination } from '../components/ui';

export default function Catalogue() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);

  useEffect(() => { api('/books/meta/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setData(null);
      api(`/books?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${page}&limit=10`)
        .then(setData).catch(() => setData({ total: 0, results: [] }));
    }, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, category, page]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    setData(null);
    api(`/books?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${page}&limit=10`).then(setData);
  };

  return (
    <Card title="Catalogue search" actions={<span className="cell-sub">{data ? `${data.total} titles` : '…'}</span>}>
      <form className="row" onSubmit={search} style={{ marginBottom: 16 }}>
        <div style={{ flex: 2, minWidth: 220 }}>
          <span className="field-label">Title, author, ISBN or keyword</span>
          <input type="search" value={q} placeholder="e.g. algorithms"
            onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search books" />
        </div>
        <div style={{ minWidth: 160 }}>
          <span className="field-label">Category</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn">Search</button>
      </form>
      {!data ? <Spinner /> : data.results.length === 0 ? <EmptyState title="No titles match" note="Try a broader keyword or clear the category filter." /> : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Code</th><th className="num">Copies</th><th>Availability</th></tr></thead>
              <tbody>{data.results.map((b) => (
                <tr key={b.id}>
                  <td><Link to={`/catalogue/${b.id}`} className="cell-strong">{b.title}</Link>
                    <div className="cell-sub">{b.publisher} · {b.edition} · {b.publicationYear || '—'}</div></td>
                  <td>{b.author}</td>
                  <td>{b.category}<div className="cell-sub">{b.subject}</div></td>
                  <td className="cell-mono">{b.bookCode}</td>
                  <td className="num">{b.availableCopies}/{b.totalCopies}</td>
                  <td>{b.availableCopies > 0 ? <Badge status="green">On shelf · {b.availableCopies}</Badge> : <Badge status="amber">All out — reservable</Badge>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        </>
      )}
    </Card>
  );
}
