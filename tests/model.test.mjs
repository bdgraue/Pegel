// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { cases } from "./model.cases.mjs";

for (const [name, run] of Object.entries(cases)) test(name, () => run(assert));
