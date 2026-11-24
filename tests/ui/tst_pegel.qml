// SPDX-License-Identifier: GPL-3.0-or-later
import QtQuick
import QtTest
import Pegel

TestCase {
    id: suite
    name: "Pegel"
    when: true
    property var win
    Component { id: mainComponent; Main {} }
    SignalSpy { id: notified; signalName: "notified" }
    function init() { fixture.reset() }
    function open() {
        win = createTemporaryObject(mainComponent, suite, {startHidden: false})
        verify(win)
        tryCompare(win, "loaded", true, 5000)
    }
    function named(name) {
        const dialog = findChild(win, "preferences")
        const obj = (dialog?.opened ? findChild(dialog.contentItem, name) : null) ?? findChild(win.contentItem, name) ?? findChild(win, name)
        verify(obj, "Missing " + name)
        return obj
    }
    function prefs() {
        const p = named("preferences")
        p.openSettings()
        tryCompare(p, "opened", true)
        return p
    }
    function readAgain() {
        win.refresh(true)
        tryCompare(win, "reading", false, 5000)
    }
    function test_accounts() {
        open()
        compare(named("laneName:claude/profile:aaa").text, "Claude · Default")
        compare(named("laneName:claude/profile:bbb").text, "Claude · work")
        compare(named("lanePlan:claude/profile:aaa").text, "Pro")
        compare(named("lanePlan:claude/profile:bbb").text, "Team")
        compare(named("percent:claude/profile:aaa:five_hour").text, "82 %")
        compare(named("percent:claude/profile:bbb:five_hour").text, "100 %")
        compare(named("percent:openrouter/default:credits").text, "—")
        compare(named("detail:openrouter/default:credits").text, "12.40 of 50.00 $")
        verify(!findChild(win.contentItem, "bar:openrouter/default:credits"))
        verify(named("lane:agy/default").opacity < 1)
        verify(named("laneAge:agy/default").text.includes("3 h ago"))
        compare(named("laneProblem:grok/default").text, "Session expired")
        verify(!findChild(win.contentItem, "lane:cursor/default"))
        compare(fixture.calls().length, 1)
        compare(fixture.calls()[0].env.QUOTA_AXI_CLAUDE_PROFILES, fixture.path("home/.claude") + ":" + fixture.path("home/.claude-work"))
        verify(!("CLAUDE_CONFIG_DIR" in fixture.calls()[0].env))
        // The lanes are laid out when the window is polished, which may come after the report has loaded.
        const list = named("list")
        for (let i = 0; i < 50 && !(list.contentHeight > list.height); i++) wait(100)
        verify(list.contentHeight > list.height, `content ${list.contentHeight}, viewport ${list.height}, window ${win.height}`)
        const tray = named("tray")
        compare(tray.fill, 1)
        compare(tray.warning, true)
        compare(tray.subtitle.split("\n")[0], "Claude · Default: 82 %")
    }
    function test_failure() {
        open()
        fixture.failWith(3, "boom")
        readAgain()
        verify(named("errorBanner").visible)
        verify(named("errorBanner").text.includes("exit 3"))
        verify(named("errorBanner").text.includes("boom"))
        compare(named("percent:claude/profile:aaa:five_hour").text, "82 %")
    }
    function test_missing_program() {
        fixture.hideProgram(true)
        open()
        verify(named("errorBanner").text.includes("quota-axi was not found"))
        verify(named("errorBanner").text.includes("npm install -g quota-axi"))
        compare(named("tray").fill, -1)
        compare(named("tray").warning, true)
    }
    function test_unknown_version() {
        fixture.setResponse({schemaVersion: 7, providers: []})
        open()
        verify(named("errorBanner").text.includes("schema version 7"))
    }
    function test_no_parallel_read() {
        open()
        fixture.setDelayMs(250)
        named("tray").refreshRequested()
        win.refresh(true)
        win.refresh(true)
        tryCompare(win, "reading", false, 5000)
        compare(fixture.calls().length, 2)
    }
    function test_reads_on_show() {
        open()
        win.hide()
        win.lastAttemptAt -= 61000
        win.show()
        tryVerify(() => fixture.calls().length === 2)
        tryCompare(win, "reading", false)
    }
    function test_preferences() {
        open()
        let p = prefs()
        named("laneNameField:claude/profile:bbb").text = "Arbeit"
        named("laneVisible:codex/default").checked = false
        named("showNotSetUpBox").checked = true
        p.accept()
        compare(named("laneName:claude/profile:bbb").text, "Claude · Arbeit")
        verify(!findChild(win.contentItem, "lane:codex/default"))
        verify(named("lane:cursor/default"))
        p = prefs()
        named("laneNameField:claude/profile:bbb").text = "Ignored"
        p.reject()
        compare(named("laneName:claude/profile:bbb").text, "Claude · Arbeit")
    }
    function test_profiles() {
        open()
        const p = prefs()
        named("profile:" + fixture.path("home/.claude-work")).checked = false
        named("profileAddField").text = "/srv/a:b"
        named("profileAddButton").clicked()
        verify(named("profileError").text.includes("colon"))
        named("profileAddField").text = "/srv/team"
        named("profileAddButton").clicked()
        p.accept()
        tryCompare(win, "reading", false)
        compare(fixture.calls()[1].env.QUOTA_AXI_CLAUDE_PROFILES, fixture.path("home/.claude") + ":/srv/team")
        verify(!findChild(win.contentItem, "lane:claude/profile:bbb"))
    }
    function test_all_profiles_disabled_with_legacy_default_lane() {
        fixture.setSetting("claudeDisabled", JSON.stringify([fixture.path("home/.claude"), fixture.path("home/.claude-work")]))
        const response = fixture.scenario()
        const account = response.providers[0]
        delete account.accountKey
        delete account.accountLocator
        response.providers = [account, response.providers[2]]
        fixture.setResponse(response)
        open()
        compare(win.report.lanes.map(lane => lane.provider), ["codex"])
    }
    function test_threshold_and_remedy() {
        open()
        named("copy:grok/default").clicked()
        compare(fixture.clipboard(), "grok")
        notified.target = named("tray")
        notified.clear()
        const response = fixture.scenario()
        response.providers[2].windows[1].percentUsed = 91
        const reset = new Date(win.report.lanes[2].windows[1].resetsAt).toISOString()
        response.providers[2].windows[1].resetsAt = reset
        fixture.setResponse(response)
        readAgain()
        verify(notified.signalArguments.some(args => args[0] === "Codex" && args[1] === "Week at 91 %"))
        notified.clear()
        readAgain()
        compare(notified.count, 0)
        notified.target = null
    }
    function test_broken_setting_preserved() {
        fixture.setSetting("hidden", "[oops")
        open()
        compare(win.settingErrors[0], "The setting hidden is unreadable and was ignored.")
        prefs().accept()
        compare(named("settings").hidden, "[oops")
    }
    function test_artifacts() {
        open()
        waitForRendering(win.contentItem)
        grabImage(win.contentItem.parent).save(fixture.artifact("list.png"))
        prefs()
        waitForRendering(win.contentItem)
        grabImage(win.contentItem.parent).save(fixture.artifact("settings.png"))
    }
}
