'use strict';
/*
 * BinaryStore — every collection (library data AND user data) is persisted as
 * a single binary file under data/<name>.cdb, never as readable text.
 *
 * File layout (little-endian):
 *   magic "CDB1" (4) | version (u8) | compression (u8) | records (u32)
 *   | uncompressed length (u32) | stored length (u32) | CRC32 (u32)
 *   | payload (stored length bytes)
 * Payload = MessagePack-encoded records, zlib-deflated.
 *
 * Integrity: CRC32 covers the decoded payload, so a corrupted or truncated
 * file is detected before any record reaches the application.
 * Atomicity: writes go to a temp file then fs.renameSync, atomic on POSIX, so
 * a crash mid-write can never leave a half-written collection.
 * Migration: legacy <name>.json documents are read once, rewritten as .cdb,
 * and kept alongside as <name>.json.migrated for rollback.
 * nextId() hands out PREFIX-00001 ids from counters held in data/meta.cdb.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { encode, decode } = require('@msgpack/msgpack');
const { dataDir } = require('../config');

const COLLECTIONS = ['users', 'members', 'books', 'copies', 'loans',
  'reservations', 'penalties', 'notifications', 'audit', 'policies'];

const MAGIC = Buffer.from('CDB1', 'latin1');
const VERSION = 1;
const COMPRESSION_DEFLATE = 1;
const HEADER = 4 + 1 + 1 + 4 + 4 + 4 + 4; // 22 bytes

/* ---- CRC32 (IEEE 802.3 polynomial, reflected) ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88329 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function encodeFile(value) {
  const raw = Buffer.from(encode(value));
  const packed = zlib.deflateSync(raw, { level: 9 });
  const head = Buffer.alloc(HEADER);
  MAGIC.copy(head, 0);
  head.writeUInt8(VERSION, 4);
  head.writeUInt8(COMPRESSION_DEFLATE, 5);
  head.writeUInt32LE(Array.isArray(value) ? value.length : 1, 6);
  head.writeUInt32LE(raw.length, 10);
  head.writeUInt32LE(packed.length, 14);
  head.writeUInt32LE(crc32(raw), 18);
  return Buffer.concat([head, packed]);
}

/** Parse + verify a .cdb buffer. Throws on magic/version/CRC failure. */
function decodeFile(buf, where) {
  const fail = (why) => { throw new Error(`${where}: corrupt binary store file (${why})`); };
  if (buf.length < HEADER) fail('shorter than header');
  if (!buf.subarray(0, 4).equals(MAGIC)) fail('bad magic');
  const version = buf.readUInt8(4);
  if (version !== VERSION) fail(`unsupported version ${version}`);
  const compression = buf.readUInt8(5);
  if (compression !== COMPRESSION_DEFLATE) fail(`unknown compression ${compression}`);
  const stored = buf.readUInt32LE(14);
  if (buf.length - HEADER !== stored) fail('payload length mismatch');
  let raw;
  try { raw = zlib.inflateSync(buf.subarray(HEADER, HEADER + stored)); }
  catch (e) { fail(`inflate: ${e.message}`); }
  if (crc32(raw) !== buf.readUInt32LE(18)) fail('CRC32 mismatch');
  if (raw.length !== buf.readUInt32LE(10)) fail('uncompressed length mismatch');
  try { return decode(raw); } catch (e) { fail(`decode: ${e.message}`); }
}

/** Legacy JSON documents: MessagePack rejects undefined, so normalise. */
function readLegacyJson(p) {
  return JSON.parse(JSON.stringify(JSON.parse(fs.readFileSync(p, 'utf8'))));
}

class BinaryStore {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();
    fs.mkdirSync(dir, { recursive: true });
    this.meta = this._readDoc('meta', { counters: {} });
    for (const name of COLLECTIONS) this._load(name);
  }

  _cdb(name) { return path.join(this.dir, `${name}.cdb`); }
  _legacy(name) { return path.join(this.dir, `${name}.json`); }

  /** Read a stored document: binary first, else migrate legacy JSON once. */
  _readDoc(name, fallback) {
    const bin = this._cdb(name);
    if (fs.existsSync(bin)) return decodeFile(fs.readFileSync(bin), `${name}.cdb`);
    const legacy = this._legacy(name);
    if (fs.existsSync(legacy)) {
      const value = readLegacyJson(legacy);
      this._writeDoc(name, value);                     // promote to binary
      fs.renameSync(legacy, `${legacy}.migrated`);     // keep rollback copy
      return value;
    }
    return structuredClone(fallback);
  }

  _writeDoc(name, data) {
    const target = this._cdb(name);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, encodeFile(data));
    fs.renameSync(tmp, target); // atomic replace — never a partial file
  }

  _load(name) {
    if (!this.cache.has(name)) this.cache.set(name, this._readDoc(name, []));
    return this.cache.get(name);
  }

  all(name) { return this._load(name); }

  /** Return a copy safe for mutation-by-replacement flows. */
  snapshot(name) { return structuredClone(this._load(name)); }

  replaceAll(name, items) {
    this.cache.set(name, items);
    this._writeDoc(name, items);
  }

  insert(name, record) {
    const items = this._load(name);
    items.push(record);
    this._writeDoc(name, items);
    return record;
  }

  update(name, id, patch) {
    const items = this._load(name);
    const i = items.findIndex((r) => r.id === id);
    if (i === -1) return null;
    items[i] = { ...items[i], ...patch, updatedAt: new Date().toISOString() };
    this._writeDoc(name, items);
    return items[i];
  }

  remove(name, id) {
    const items = this._load(name);
    const kept = items.filter((r) => r.id !== id);
    if (kept.length === items.length) return false;
    this.cache.set(name, kept);
    this._writeDoc(name, kept);
    return true;
  }

  nextId(prefix) {
    const n = (this.meta.counters[prefix] || 0) + 1;
    this.meta.counters[prefix] = n;
    this._writeDoc('meta', this.meta);
    return `${prefix}-${String(n).padStart(5, '0')}`;
  }

  /** Reset every collection (used by the seeder and tests). */
  resetAll() {
    this.cache.clear();
    this.meta = { counters: {} };
    this._writeDoc('meta', this.meta);
    for (const name of COLLECTIONS) {
      this.cache.set(name, []);
      this._writeDoc(name, []);
    }
  }
}

let store = null;
function getStore() { if (!store) store = new BinaryStore(dataDir); return store; }
function setStore(s) { store = s; }

// JsonStore alias keeps existing requires/tests working through the rename.
module.exports = { BinaryStore, JsonStore: BinaryStore, getStore, setStore, COLLECTIONS,
  __internals: { encodeFile, decodeFile, crc32, HEADER, MAGIC } };
