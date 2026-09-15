'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JsonStore } = require('../../src/db/store');

describe('JsonStore — atomic JSON persistence', () => {
  let dir, store;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clms-store-'));
    store = new JsonStore(dir);
  });

  test('insert assigns PREFIX-00001 style sequential ids', () => {
    expect(store.nextId('BK')).toBe('BK-00001');
    expect(store.nextId('BK')).toBe('BK-00002');
    expect(store.nextId('CP')).toBe('CP-00001');
  });

  test('records round-trip through disk', () => {
    store.insert('books', { id: 'BK-00001', title: 'Clean Code' });
    const reopened = new JsonStore(dir);
    expect(reopened.all('books')).toHaveLength(1);
    expect(reopened.all('books')[0].title).toBe('Clean Code');
  });

  test('update patches fields and stamps updatedAt; missing id returns null', () => {
    store.insert('loans', { id: 'LN-1', status: 'ACTIVE' });
    const updated = store.update('loans', 'LN-1', { status: 'RETURNED' });
    expect(updated.status).toBe('RETURNED');
    expect(updated.updatedAt).toMatch(/^\d{4}-/);
    expect(store.update('loans', 'NOPE', {})).toBeNull();
  });

  test('no temp files are left behind (write-to-tmp + rename protocol)', () => {
    store.insert('books', { id: 'BK-9', title: 'x' });
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  test('collection file contains valid JSON (crash-safe shape)', () => {
    store.insert('members', { id: 'MB-1', name: 'Arun' });
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'members.json'), 'utf8'));
    expect(raw[0].memberId).toBeUndefined();
    expect(raw[0].name).toBe('Arun');
  });

  test('remove deletes exactly one record', () => {
    store.insert('books', { id: 'A' }); store.insert('books', { id: 'B' });
    expect(store.remove('books', 'A')).toBe(true);
    expect(store.remove('books', 'ZZ')).toBe(false);
    expect(store.all('books').map((b) => b.id)).toEqual(['B']);
  });

  test('resetAll empties every collection and counters', () => {
    store.insert('books', { id: 'BK-1' });
    store.resetAll();
    expect(store.all('books')).toEqual([]);
    expect(store.nextId('BK')).toBe('BK-00001');
  });
});

describe('Repository wrapper', () => {
  test('insert stamps id + timestamps; find/byId query', () => {
    const fs2 = require('fs');
    const dir = fs2.mkdtempSync(path.join(os.tmpdir(), 'clms-repo-'));
    const { setStore } = require('../../src/db/store');
    setStore(new JsonStore(dir));
    const { Repository } = require('../../src/repositories/repository');
    const repo = new Repository('books', 'BK');
    const rec = repo.insert({ title: 'DSA' });
    expect(rec.id).toBe('BK-00001');
    expect(rec.createdAt).toBeTruthy();
    expect(repo.byId(rec.id).title).toBe('DSA');
    expect(repo.find((b) => b.title === 'DSA')).toHaveLength(1);
    expect(repo.count()).toBe(1);
  });
});
