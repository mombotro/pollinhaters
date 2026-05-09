export default class ResourceManager {
  constructor({ honeyStorage, sapConversionRate }) {
    this._honeyStorage = honeyStorage;
    this._sapConversionRate = sapConversionRate;
    this._honey = 0;
    this._pendingSap = 0;
    this._carried = {};
  }

  getSapCarried(id) { return this._carried[id] ?? 0; }
  getHoney() { return this._honey; }
  getHoneyStorage() { return this._honeyStorage; }
  getPendingSap() { return this._pendingSap; }

  addSap(id, amount, capacity) {
    const current = this.getSapCarried(id);
    this._carried[id] = Math.min(current + amount, capacity);
  }

  depositSap(id) {
    this._pendingSap += this._carried[id] ?? 0;
    this._carried[id] = 0;
  }

  convertSap(units) {
    const converting = Math.min(this._pendingSap, units);
    this._honey = Math.min(this._honey + converting * this._sapConversionRate, this._honeyStorage);
    this._pendingSap -= converting;
  }

  stealSap(id, amount) {
    const available = this.getSapCarried(id);
    const stolen = Math.min(available, amount);
    this._carried[id] = available - stolen;
    return stolen;
  }

  stealHoney(amount) {
    const stolen = Math.min(this._honey, amount);
    this._honey -= stolen;
    return stolen;
  }

  spendHoney(amount) {
    if (this._honey < amount) return false;
    this._honey -= amount;
    return true;
  }

  setHoneyStorage(cap) {
    this._honeyStorage = cap;
  }

  addPendingSap(amount) {
    this._pendingSap += amount;
  }
}
