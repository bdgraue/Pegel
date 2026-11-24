// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

// What Qt's JavaScript engine provides to src/model.mjs: qsTr returns the source text (no translator under Node),
// and String.prototype.arg replaces the lowest-numbered %N, as QString::arg does.
globalThis.qsTr = text => text;
Object.defineProperty(String.prototype, "arg", {
  value(value) {
    const numbers = [...this.matchAll(/%(\d+)/g)].map(m => Number(m[1]));
    if (!numbers.length) throw new Error(`No %N left in "${this}"`);
    const lowest = Math.min(...numbers);
    return this.replace(new RegExp(`%${lowest}(?!\\d)`, "g"), String(value));
  },
});
process.env.TZ = "UTC";
