// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

export const SCHEMA_VERSIONS = [5, 6];
export const STATUSES = ["fresh", "stale", "unavailable", "auth_required", "rate_limited", "error"];
export const REFRESH_MINUTES = 5;
export const SHOW_REFRESH_MS = 60000;
export const RESET_READ_DELAY_MS = 30000;
export const READ_TIMEOUT_MS = 60000;
export const DEFAULT_KINDS = { session: true, weekly: true, monthly: true, model: false, other: true };
export const QUOTA_ARGS = ["--json", "--full"];
export const ENV_REMOVE = ["CLAUDE_CONFIG_DIR", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"];
export const ENV_REMOVE_PREFIXES = ["QUOTA_AXI_"];
export const INSTALL_HINT = "npm install -g quota-axi";

export function level(percent) {
    if (percent >= 92) return 3;
    if (percent >= 80) return 2;
    return percent >= 60 ? 1 : 0;
}

export function extractJson(stdout) {
    const start = stdout.indexOf("{");
    const end = stdout.lastIndexOf("}");
    if (start < 0 || end < start) throw new Error(qsTr("quota-axi printed no JSON."));
    return stdout.slice(start, end + 1);
}

function timestamp(value) {
    if (value == null) return null;
    const ms = typeof value === "string" ? Date.parse(value) : NaN;
    if (!Number.isFinite(ms)) throw new Error(qsTr("quota-axi reported an invalid timestamp."));
    return ms;
}

function optionalNumber(value) {
    if (value == null) return null;
    if (!Number.isFinite(value)) throw new Error(qsTr("quota-axi reported an invalid number."));
    return value;
}

function amountOf(w) {
    if (w.spentUsd != null && w.limitUsd != null)
        return { used: optionalNumber(w.spentUsd), limit: optionalNumber(w.limitUsd), unit: "$" };
    if (w.usedCredits != null && w.limitCredits != null)
        return { used: optionalNumber(w.usedCredits), limit: optionalNumber(w.limitCredits), unit: w.creditUnit || "" };
    return null;
}

function normalizeWindow(w, untrustedIds) {
    if (!w || !w.id || !w.kind || typeof w.label !== "string")
        throw new Error(qsTr("quota-axi reported an invalid limit window."));
    const resetsAt = timestamp(w.resetsAt);
    const startsAt = timestamp(w.startsAt);
    let cycle = optionalNumber(w.windowSeconds);
    if (cycle === null && resetsAt !== null && startsAt !== null) cycle = (resetsAt - startsAt) / 1000;
    return {
        id: w.id, label: w.label, kind: w.kind, percentUsed: optionalNumber(w.percentUsed),
        resetsAt, startsAt, cycleSeconds: cycle > 0 ? cycle : null, shareOf: w.shareOf || "",
        untrusted: untrustedIds.includes(w.id), amount: amountOf(w),
        exhaustedAt: w.pace?.projectionConfidence === "established" ? timestamp(w.pace.projectedExhaustedAt) : null
    };
}

function normalizeRunway(row, windows) {
    const scope = row.quotaSemantics?.effectiveAvailability?.find(s => s.scope === "all_models");
    if (scope?.status !== "known" || !scope.runway) return null;
    const runway = scope.runway;
    const limit = windows.find(w => w.id === runway.limitingWindowId);
    return { status: runway.status, remaining: optionalNumber(scope.effectivePercentRemaining),
             exhaustedAt: timestamp(runway.projectedExhaustedAt), freeAt: limit?.resetsAt ?? null,
             confident: runway.projectionConfidence === "established" };
}

export function parseReport(stdout, readAt, disabledDirs, defaultClaudeDir = "") {
    const report = JSON.parse(extractJson(stdout));
    if (!SCHEMA_VERSIONS.includes(report.schemaVersion))
        throw new Error(qsTr("quota-axi reported schema version %1; Pegel knows 5 and 6.").arg(String(report.schemaVersion)));
    if (!Array.isArray(report.providers)) throw new Error(qsTr("quota-axi reported no provider list."));
    const lanes = [];
    const keys = new Set();
    for (const row of report.providers) {
        if (!row || typeof row.provider !== "string" || !row.provider || !Array.isArray(row.windows))
            throw new Error(qsTr("quota-axi reported an invalid provider entry."));
        const key = row.provider + "/" + (row.accountKey ?? "default");
        if (keys.has(key)) throw new Error(qsTr("quota-axi reported the account %1 twice.").arg(key));
        keys.add(key);
        const state = row.state || {};
        if (!STATUSES.includes(state.status))
            throw new Error(qsTr("quota-axi reported the unknown status %1.").arg(String(state.status)));
        // Without explicit profiles quota-axi returns its default Claude lane without a locator.
        const implicitDefault = row.provider === "claude" && !row.accountKey;
        const profileDir = row.accountLocator?.path || (implicitDefault ? defaultClaudeDir : "");
        if (profileDir && disabledDirs.includes(profileDir)) continue;
        const windows = row.windows.map(w => normalizeWindow(w, state.untrustedWindowIds || []));
        const credits = row.credits;
        lanes.push({ key, provider: row.provider, label: row.label || row.provider, plan: row.plan || "",
            status: state.status, notSetUp: row.notSetUp === true,
            refreshedAt: timestamp(state.refreshedAt) ?? (state.status === "fresh" ? readAt : null),
            error: state.error || "", reason: state.reason || "", remedyCommand: state.remedyCommand || "",
            retryAfter: timestamp(state.retryAfter), profileDir, email: row.account?.email || "",
            organization: row.account?.organization || "", windows, runway: normalizeRunway(row, windows),
            credits: credits ? { remaining: optionalNumber(credits.remaining), unlimited: credits.unlimited === true,
                                 unit: credits.unit || "" } : null });
    }
    return { readAt, lanes };
}

const MINUTE = 60000;
const DAY = 86400000;
export function until(ms) {
    const minutes = Math.max(0, Math.ceil(ms / MINUTE));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days) return hours % 24 ? qsTr("%1 d %2 h").arg(days).arg(hours % 24) : qsTr("%1 d").arg(days);
    if (hours) return minutes % 60 ? qsTr("%1 h %2 min").arg(hours).arg(minutes % 60) : qsTr("%1 h").arg(hours);
    return qsTr("%1 min").arg(minutes);
}

export function ago(ms) {
    if (ms < MINUTE) return qsTr("just now");
    if (ms < 60 * MINUTE) return qsTr("%1 min ago").arg(Math.floor(ms / MINUTE));
    if (ms < DAY) return qsTr("%1 h ago").arg(Math.floor(ms / (60 * MINUTE)));
    return qsTr("%1 d ago").arg(Math.floor(ms / DAY));
}

function localDay(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

export function clock(at, now) {
    const date = new Date(at);
    const days = localDay(date) - localDay(new Date(now));
    const hhmm = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
    if (days === 0) return hhmm;
    if (days > 6) return qsTr("in %1 d").arg(days);
    const weekdays = [qsTr("Sun"), qsTr("Mon"), qsTr("Tue"), qsTr("Wed"), qsTr("Thu"), qsTr("Fri"), qsTr("Sat")];
    return qsTr("%1 %2").arg(weekdays[date.getDay()]).arg(hhmm);
}

export function isOld(lane, now, refreshMs) {
    return lane.status === "stale" || lane.refreshedAt === null || now - lane.refreshedAt > 2 * refreshMs;
}

function windowLabel(lane, w) {
    if (lane.windows.filter(other => other.kind === w.kind).length > 1) return w.label;
    if (w.kind === "session") return qsTr("%1 hours").arg(w.cycleSeconds ? Math.round(w.cycleSeconds / 3600) : 5);
    if (w.kind === "weekly") return qsTr("Week");
    if (w.kind === "monthly") return qsTr("Month");
    return w.label;
}

function knownReset(lane, w) {
    return w.resetsAt !== null && lane.refreshedAt !== null && w.resetsAt > lane.refreshedAt;
}

function fraction(value) { return Math.max(0, Math.min(1, value)); }
function amountText(amount) {
    if (!amount) return "";
    const format = x => x.toFixed(2).replace(".", qsTr("."));
    return qsTr("%1 of %2 %3").arg(format(amount.used)).arg(format(amount.limit)).arg(amount.unit).trim();
}

export function windowView(lane, w, now, refreshMs) {
    const reset = knownReset(lane, w);
    const expired = reset && w.resetsAt <= now;
    const elapsed = reset && !expired && w.cycleSeconds > 0
        ? fraction(1 - (w.resetsAt - now) / (1000 * w.cycleSeconds)) : null;
    const details = [];
    if (w.untrusted) details.push(qsTr("not trusted by quota-axi"));
    else if (expired) details.push(qsTr("no new reading since the reset"));
    else if (w.percentUsed === null) details.push(amountText(w.amount));
    else {
        if (reset) details.push(qsTr("resets in %1").arg(until(w.resetsAt - now)));
        if (elapsed !== null && elapsed >= 0.03) {
            const delta = Math.round(w.percentUsed - elapsed * 100);
            if (Math.abs(delta) < 5) details.push(qsTr("on pace"));
            else details.push((delta > 0 ? qsTr("%1 % over pace") : qsTr("%1 % under pace")).arg(Math.abs(delta)));
        }
        if (w.kind === "model" && reset && w.exhaustedAt > now && w.exhaustedAt < w.resetsAt)
            details.push(qsTr("empty around %1").arg(clock(w.exhaustedAt, now)));
    }
    return { label: windowLabel(lane, w), percentText: w.percentUsed === null ? "—" : qsTr("%1 %").arg(Math.round(w.percentUsed)),
             fill: w.percentUsed === null ? null : fraction(w.percentUsed / 100),
             level: w.percentUsed === null ? null : level(w.percentUsed), elapsed, detail: details.join(" · "),
             dimmed: w.untrusted || expired || isOld(lane, now, refreshMs), indent: !!w.shareOf };
}

export function laneNames(lanes, names) {
    const result = {};
    for (const lane of lanes) {
        let suffix = names[lane.key] || "";
        if (!suffix && lanes.some(other => other !== lane && other.provider === lane.provider)) {
            const folder = lane.profileDir.split("/").filter(Boolean).pop();
            suffix = folder === ".claude" ? qsTr("Default") : (folder || "").replace(/^\.claude-/, "");
            if (!suffix) suffix = lane.key.slice(lane.key.indexOf("/") + 1);
        }
        result[lane.key] = suffix ? qsTr("%1 · %2").arg(lane.label).arg(suffix) : lane.label;
    }
    return result;
}

export function visibleLanes(report, options) {
    return (report?.lanes || []).filter(l => !options.hidden.includes(l.key) && (!l.notSetUp || options.showNotSetUp));
}
export function notSetUpCount(report) { return (report?.lanes || []).filter(l => l.notSetUp).length; }
export function planText(lane) { return lane.plan.charAt(0).toUpperCase() + lane.plan.slice(1); }

export function laneSummary(lane, now) {
    const r = lane.runway;
    if (!r) return "";
    if (r.status === "exhausted_now")
        return r.freeAt == null ? qsTr("used up") : qsTr("used up · free from %1").arg(clock(r.freeAt, now));
    if (r.remaining == null) return "";
    const left = Math.round(r.remaining);
    if (r.status === "through_reset") return qsTr("%1 % left · lasts until the reset").arg(left);
    if (r.status !== "projected_exhaustion") return "";
    if (!r.confident || r.exhaustedAt == null) return qsTr("%1 % left").arg(left);
    return qsTr("%1 % left · empty around %2").arg(left).arg(clock(r.exhaustedAt, now));
}

export function laneProblem(lane, now) {
    if (["fresh", "stale"].includes(lane.status) && lane.windows.length) return null;
    let text;
    if (lane.reason === "credentials_expired") text = qsTr("Session expired");
    else if (lane.status === "auth_required") text = qsTr("Sign-in required");
    else if (lane.status === "rate_limited")
        text = lane.retryAfter === null ? qsTr("Rate limited") : qsTr("Rate limit until %1").arg(clock(lane.retryAfter, now));
    else text = lane.error ? qsTr("Not available: %1").arg(lane.error) : qsTr("Not available");
    return { text, command: lane.remedyCommand };
}

export function laneAge(lane, now, refreshMs) {
    if (!isOld(lane, now, refreshMs)) return "";
    if (lane.refreshedAt === null) return qsTr("Outdated reading");
    return qsTr("Reading from %1").arg(ago(now - lane.refreshedAt));
}

export function creditsText(lane) {
    const credits = lane.credits;
    if (credits?.unlimited) return qsTr("Credit: unlimited");
    if (credits?.remaining > 0) return qsTr("Credit: %1 %2").arg(credits.remaining).arg(credits.unit).trim();
    return "";
}

export function countedWindows(report, options, now) {
    const counted = [];
    for (const lane of visibleLanes(report, options)) {
        if (lane.notSetUp || laneProblem(lane, now) || isOld(lane, now, options.refreshMs)) continue;
        for (const w of lane.windows) {
            if (w.percentUsed === null || w.shareOf || w.untrusted) continue;
            if (knownReset(lane, w) && w.resetsAt <= now) continue;
            const kind = ["credits", "unknown"].includes(w.kind) ? "other" : w.kind;
            if (options.kinds[kind]) counted.push({ lane, window: w, percent: w.percentUsed });
        }
    }
    return counted;
}

export function trayState(report, options, now, readError) {
    const names = laneNames(report?.lanes || [], options.names);
    const maxima = new Map();
    let peak = null;
    for (const item of countedWindows(report, options, now)) {
        const key = item.lane.key;
        maxima.set(key, Math.max(maxima.get(key) ?? -Infinity, item.percent));
        peak = peak === null ? item.percent : Math.max(peak, item.percent);
    }
    const lines = readError ? [readError.title] : [];
    maxima.forEach((percent, key) => lines.push(qsTr("%1: %2 %").arg(names[key]).arg(Math.round(percent))));
    const warning = !!readError || visibleLanes(report, options).some(l => !l.notSetUp && !!laneProblem(l, now));
    return { fill: peak === null ? null : fraction(peak / 100), level: peak === null ? null : level(peak),
             warning, tooltip: lines.join("\n") };
}

export function notifications(memory, report, options, now) {
    const names = laneNames(report?.lanes || [], options.names);
    const cycles = Object.assign({}, memory.cycles);
    const messages = [];
    for (const item of countedWindows(report, options, now)) {
        const lane = item.lane, w = item.window;
        const key = lane.key + "|" + w.id;
        const previous = cycles[key];
        const changed = previous && previous.resetsAt !== w.resetsAt;
        const state = previous && !changed ? Object.assign({}, previous)
                                          : { resetsAt: w.resetsAt, warned: false, exhausted: false };
        const label = windowLabel(lane, w);
        function send(body, icon) {
            if (memory.primed && options.notify) messages.push({ title: names[lane.key], body, icon });
        }
        if (changed && previous.exhausted && item.percent < 100)
            send(qsTr("%1 available again").arg(label), "io.github.bdgraue.Pegel");
        if (item.percent >= 100 && !state.exhausted) {
            const body = knownReset(lane, w) ? qsTr("%1 used up, free from %2").arg(label).arg(clock(w.resetsAt, now))
                                            : qsTr("%1 used up").arg(label);
            send(body, "dialog-warning");
            state.exhausted = true;
            state.warned = true;
        } else if (item.percent >= options.threshold && !state.warned) {
            send(qsTr("%1 at %2 %").arg(label).arg(Math.round(item.percent)), "dialog-warning");
            state.warned = true;
        }
        cycles[key] = state;
    }
    return { memory: { primed: true, cycles }, messages };
}

export function nextResetRead(report, options, now) {
    let first = null;
    for (const item of countedWindows(report, options, now)) {
        if (item.percent < options.threshold || !knownReset(item.lane, item.window)) continue;
        const due = item.window.resetsAt + RESET_READ_DELAY_MS;
        first = first === null ? due : Math.min(first, due);
    }
    return first;
}
export function readDue(lastAttemptAt, now, refreshMs) { return now - lastAttemptAt >= refreshMs; }

export function claudeProfiles(candidates, disabled) {
    const dirs = [];
    const rejected = [];
    for (const c of candidates) {
        if (!c.manual && !(c.isDir && (c.hasCredentials || c.hasSettings || c.hasProjects))) continue;
        const path = c.canonicalPath || c.path;
        if (disabled.includes(path) || disabled.includes(c.path)) continue;
        if (path.includes(":") || c.path.includes(":")) {
            rejected.push({ path: c.path, reason: qsTr("The path contains a colon, which separates the folders handed to quota-axi.") });
        } else if (!dirs.includes(path)) dirs.push(path);
    }
    return { dirs, rejected };
}

export function invocation(quotaPath, found, shell, dirs) {
    const direct = quotaPath || found;
    if (!direct && !shell) throw new Error(qsTr("quota-axi was not found."));
    return { program: direct || shell, args: direct ? QUOTA_ARGS : ["-lic", "exec quota-axi --json --full"],
             env: { remove: ENV_REMOVE, removePrefixes: ENV_REMOVE_PREFIXES,
                    set: dirs.length ? { QUOTA_AXI_CLAUDE_PROFILES: dirs.join(":") } : {} } };
}

export function readFailure(code, stderr) {
    let title, hint = "";
    if (code === -2) {
        title = qsTr("quota-axi could not be started");
        hint = INSTALL_HINT;
    } else if (code === -1) title = qsTr("quota-axi did not answer");
    else title = qsTr("quota-axi failed (exit %1)").arg(code);
    const detail = stderr.trim().split(/\r?\n/).pop().trim();
    return { title, detail, hint };
}

export function parseSetting(name, text, fallback) {
    try {
        const value = JSON.parse(text);
        if (value !== null && typeof value === "object" && Array.isArray(value) === Array.isArray(fallback))
            return { value, error: "" };
    } catch (_) {
        // Keep the original setting on disk until the user changes this field.
    }
    return { value: fallback, error: qsTr("The setting %1 is unreadable and was ignored.").arg(name) };
}
