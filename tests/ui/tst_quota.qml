// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

import QtQuick
import QtTest
import Pegel
import "../../src/model.mjs" as Model

TestCase {
    name: "Quota"
    function init() { fixture.reset(); }
    function run(program, args, settings, timeout = 3000) {
        let result = null;
        Quota.run(program, args, settings, (code, out, err) => { result = {code, out, err}; }, timeout);
        tryVerify(() => result !== null, timeout + 2000);
        return result;
    }
    function fake() { return fixture.path("bin/quota-axi"); }
    function test_environment() {
        const inv = Model.invocation(fake(), "", "", ["/a", "/b"]);
        compare(run(inv.program, inv.args, inv.env).code, 0);
        compare(fixture.calls()[0].args, ["--json", "--full"]);
        compare(fixture.calls()[0].env, {QUOTA_AXI_CLAUDE_PROFILES: "/a:/b"});
    }
    function test_login_environment() {
        const inv = Model.invocation("", "", fixture.path("bin/fake-login-shell"), ["/a b", "/x"]);
        compare(run(inv.program, inv.args, inv.env).code, 0);
        compare(fixture.calls()[0].env, {QUOTA_AXI_CLAUDE_PROFILES: "/a b:/x"});
    }
    function test_missing_program() {
        const r = run(fixture.path("missing"), [], {});
        compare(r.code, -2);
        verify(r.err.length > 0);
    }
    function test_timeout() {
        fixture.setDelayMs(5000);
        const r = run(fake(), [], {}, 200);
        compare(r.code, -1);
        verify(r.err.length > 0);
    }
    function test_exit_and_stderr() {
        fixture.failWith(3, "boom");
        const r = run(fake(), [], {});
        compare(r.code, 3);
        compare(r.err.trim(), "boom");
    }
    function test_candidates() {
        const c = Quota.claudeCandidates(["~/extra"]);
        compare(c.map(x => x.path.replace(fixture.path("home"), "~")), ["~/.claude", "~/.claude-work", "~/extra"]);
        compare([c[0].hasCredentials, c[1].hasSettings, c[2].isDir, c[2].manual], [true, true, false, true]);
    }
    function test_icon() {
        compare(Quota.providerIcon("claude").toString(), "");
        fixture.write("data/pegel/icons/claude.svg", "<svg/>");
        verify(Quota.providerIcon("claude").toString().endsWith("/pegel/icons/claude.svg"));
        compare(Quota.providerIcon("../icons/claude").toString(), "");
    }
    function test_autostart() {
        Launcher.autostart = true;
        verify(fixture.read("config/autostart/pegel.desktop").includes("--hidden"));
        Launcher.autostart = false;
        verify(!fixture.exists("config/autostart/pegel.desktop"));
    }
}
