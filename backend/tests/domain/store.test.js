'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JsonStore, BinaryStore, __internals } = require('../../src/db/store');

describe('BinaryStore — atomic binary (.cdb) persistence', () => {
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

  test('collection persists as a binary container, never readable text', () => {
    store.insert('members', { id: 'MB-1', name: 'Arun' });
    const buf = fs.readFileSync(path.join(dir, 'members.cdb'));
    expect(buf.subarray(0, 4).toString('latin1')).toBe('CDB1'); // magic
    expect(buf.includes(Buffer.from('Arun'))).toBe(false);      // payload is encoded+deflated
    expect(__internals.decodeFile(buf, 'members.cdb')[0].name).toBe('Arun');
  });

  test('corrupted binary file is rejected via CRC32 before records load', () => {
    store.insert('books', { id: 'BK-1', title: 'DDD' });
    const p = path.join(dir, 'books.cdb');
    const buf = fs.readFileSync(p);
    buf[buf.length - 1] ^= 0xFF; // flip a payload byte
    expect(() => __internals.decodeFile(buf, 'books.cdb')).toThrow(/corrupt binary store file/);
  });

  test('legacy .json documents migrate to .cdb once, with a rollback copy', () => {
    fs.writeFileSync(path.join(dir, 'books.json'), JSON.stringify([{ id: 'BK-old', title: 'Legacy' }]));
    const reopened = new BinaryStore(dir);
    expect(reopened.all('books')[0].title).toBe('Legacy');
    expect(fs.existsSync(path.join(dir, 'books.cdb'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'books.json.migrated'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'books.json'))).toBe(false);
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
