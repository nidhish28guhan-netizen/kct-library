'use strict';
/* Generic collection repository: id/timestamp assignment + queries over JsonStore. */
const { getStore } = require('../db/store');

class Repository {
  constructor(collection, prefix) {
    this.collection = collection;
    this.prefix = prefix;
  }
  get store() { return getStore(); }

  all() { return this.store.all(this.collection); }
  byId(id) { return this.all().find((r) => r.id === id) || null; }
  find(pred) { return this.all().filter(pred); }
  findOne(pred) { return this.all().find(pred) || null; }
  count(pred) { return pred ? this.find(pred).length : this.all().length; }

  insert(data) {
    const now = new Date().toISOString();
    const record = { id: this.store.nextId(this.prefix), createdAt: now, updatedAt: now, ...data };
    return this.store.insert(this.collection, record);
  }

  update(id, patch) { return this.store.update(this.collection, id, patch); }
  remove(id) { return this.store.remove(this.collection, id); }
}

module.exports = { Repository };
