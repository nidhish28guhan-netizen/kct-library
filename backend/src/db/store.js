'use strict';
/*
 * JsonStore — file-backed document store with atomic writes.
 * Each collection lives in data/<name>.json. Writes go to a temp file then
 * fs.renameSync, which is atomic on POSIX: a crash mid-write can never leave
 * a half-written collection file. nextId() hands out PREFIX-00001 style ids
 * from data/meta.json counters.
 */
const fs = require('fs');
const path = require('path');
const { dataDir } = require('../config');

const COLLECTIONS = ['users', 'members', 'books', 'copies', 'loans',
  'reservations', 'penalties', 'notifications', 'audit', 'policies'];

class JsonStore {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();
    fs.mkdirSync(dir, { recursive: true });
    this.meta = this._read('meta.json', { counters: {} });
    for (const name of COLLECTIONS) this._load(name);
  }

  _file(name) { return name.endsWith('.json') ? name : `${name}.json`; }

  _read(name, fallback) {
    const p = path.join(this.dir, this._file(name));
    if (!fs.existsSync(p)) return structuredClone(fallback);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  _write(name, data) {
    const p = path.join(this.dir, this._file(name));
    const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, p); // atomic replace — never a partial file
  }

  _load(name) {
    if (!this.cache.has(name)) this.cache.set(name, this._read(name, []));
    return this.cache.get(name);
  }

  all(name) { return this._load(name); }

  /** Return a copy safe for mutation-by-replacement flows. */
  snapshot(name) { return structuredClone(this._load(name)); }

  replaceAll(name, items) {
    this.cache.set(name, items);
    this._write(name, items);
  }

  insert(name, record) {
    const items = this._load(name);
    items.push(record);
    this._write(name, items);
    return record;
  }

  update(name, id, patch) {
    const items = this._load(name);
    const i = items.findIndex((r) => r.id === id);
    if (i === -1) return null;
    items[i] = { ...items[i], ...patch, updatedAt: new Date().toISOString() };
    this._write(name, items);
    return items[i];
  }

  remove(name, id) {
    const items = this._load(name);
    const kept = items.filter((r) => r.id !== id);
    if (kept.length === items.length) return false;
    this.cache.set(name, kept);
    this._write(name, kept);
    return true;
  }

  nextId(prefix) {
    const n = (this.meta.counters[prefix] || 0) + 1;
    this.meta.counters[prefix] = n;
    this._write('meta.json', this.meta);
    return `${prefix}-${String(n).padStart(5, '0')}`;
  }

  /** Reset every collection (used by the seeder and tests). */
  resetAll() {
    this.cache.clear();
    this.meta = { counters: {} };
    this._write('meta.json', this.meta);
    for (const name of COLLECTIONS) {
      this.cache.set(name, []);
      this._write(name, []);
    }
  }
}

let store = null;
function getStore() { if (!store) store = new JsonStore(dataDir); return store; }
function setStore(s) { store = s; }

module.exports = { JsonStore, getStore, setStore, COLLECTIONS };
