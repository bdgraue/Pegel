// SPDX-License-Identifier: GPL-3.0-or-later
import QtCore
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import Pegel
import "model.mjs" as Model

Kirigami.ApplicationWindow {
    id: root

    required property bool startHidden
    property var report: null
    property var readError: null
    property bool loaded: false
    property bool reading: false
    property bool manualReading: false
    property bool pendingConfigRead: false
    property real now: Date.now()
    property real lastAttemptAt: 0
    property var nextResetAt: null
    property var memory: ({primed: false, cycles: {}})
    property var rejectedFolders: []
    property string autostartError: ""
    readonly property var parsed: ({
        hidden: Model.parseSetting("hidden", config.hidden, []),
        names: Model.parseSetting("names", config.names, {}),
        kinds: Model.parseSetting("kinds", config.kinds, Model.DEFAULT_KINDS),
        claudeManual: Model.parseSetting("claudeManual", config.claudeManual, []),
        claudeDisabled: Model.parseSetting("claudeDisabled", config.claudeDisabled, [])
    })
    readonly property var options: ({
        hidden: parsed.hidden.value, names: parsed.names.value, kinds: parsed.kinds.value,
        showNotSetUp: config.showNotSetUp, notify: config.notify,
        threshold: config.threshold, refreshMs: config.refreshMinutes * 60000
    })
    readonly property var settingErrors: Object.keys(parsed).map(k => parsed[k].error).filter(Boolean)
        .concat(rejectedFolders.map(r => r.path + ": " + r.reason))
    readonly property var names: report ? Model.laneNames(report.lanes, options.names) : ({})
    readonly property var trayView: Model.trayState(report ?? {lanes: []}, options, now, readError)
    readonly property var colors: {
        const yellow = Kirigami.Theme.neutralTextColor
        const red = Kirigami.Theme.negativeTextColor
        return [Kirigami.Theme.positiveTextColor, yellow,
                Qt.rgba((yellow.r + red.r)/2, (yellow.g + red.g)/2, (yellow.b + red.b)/2, 1), red]
    }

    width: 340
    height: 540
    minimumWidth: 260
    minimumHeight: 200
    title: qsTr("Pegel")
    visible: !startHidden
    onClosing: event => { event.accepted = false; hide() }

    function onShow() {
        if (loaded && Date.now() - lastAttemptAt > Model.SHOW_REFRESH_MS)
            refresh(false)
    }
    onActiveChanged: if (active) onShow()
    onVisibleChanged: if (visible) onShow()
    Component.onCompleted: refresh(false)

    function configChanged() {
        if (reading)
            pendingConfigRead = true
        else
            refresh(false)
    }

    function refresh(manual) {
        if (reading)
            return
        reading = true
        manualReading = manual
        lastAttemptAt = Date.now()
        const disabled = parsed.claudeDisabled.value
        function done() {
            reading = false
            manualReading = false
            loaded = true
            if (pendingConfigRead) {
                pendingConfigRead = false
                refresh(false)
            }
        }
        function failed(error) {
            readError = {title: error.message, detail: "", hint: error.message === qsTr("quota-axi was not found.") ? Model.INSTALL_HINT : ""}
        }
        try {
            const candidates = Quota.claudeCandidates(parsed.claudeManual.value)
            const profiles = Model.claudeProfiles(candidates, disabled)
            rejectedFolders = profiles.rejected
            const cmd = Model.invocation(config.quotaPath, Quota.findProgram("quota-axi"), Quota.loginShell(), profiles.dirs)
            Quota.run(cmd.program, cmd.args, cmd.env, (code, out, err) => {
                try {
                    if (code === 0) {
                        now = Date.now()
                        const result = Model.parseReport(out, now, disabled, candidates[0].canonicalPath)
                        report = result
                        readError = null
                        nextResetAt = Model.nextResetRead(result, options, now)
                        const events = Model.notifications(memory, result, options, now)
                        memory = events.memory
                        events.messages.forEach(m => tray.notify(m.title, m.body, m.icon))
                    } else {
                        readError = Model.readFailure(code, err)
                    }
                } catch (error) {
                    failed(error)
                } finally {
                    done()
                }
            }, Model.READ_TIMEOUT_MS)
        } catch (error) {
            failed(error)
            done()
        }
    }
    onOptionsChanged: if (report) nextResetAt = Model.nextResetRead(report, options, now)
    Timer {
        interval: 30000
        running: true
        repeat: true
        onTriggered: {
            root.now = Date.now()
            if (root.nextResetAt !== null && root.now >= root.nextResetAt) {
                root.nextResetAt = null
                root.refresh(false)
            } else if (Model.readDue(root.lastAttemptAt, root.now, root.options.refreshMs)) {
                root.refresh(false)
            }
        }
    }
    Settings {
        id: config
        objectName: "settings"
        property int refreshMinutes: 5
        property bool notify: true
        property int threshold: 90
        property string kinds: JSON.stringify(Model.DEFAULT_KINDS)
        property string hidden: "[]"
        property string names: "{}"
        property string claudeManual: "[]"
        property string claudeDisabled: "[]"
        property bool showNotSetUp: false
        property string quotaPath: ""
        property alias windowWidth: root.width
        property alias windowHeight: root.height
    }
    Tray {
        id: tray
        objectName: "tray"
        window: root
        fill: root.trayView.fill ?? -1
        color: root.colors[root.trayView.level ?? 0]
        warning: root.trayView.warning
        subtitle: root.trayView.tooltip
        onRefreshRequested: root.refresh(true)
        onSettingsRequested: {
            root.show()
            root.raise()
            root.requestActivate()
            prefs.openSettings()
        }
    }
    Connections {
        target: Launcher
        function onAutostartFailed(message) { root.autostartError = message }
    }
    Preferences {
        id: prefs
        settings: config
        parsed: root.parsed
        report: root.report
        onReadRequested: root.configChanged()
    }
    header: Controls.ToolBar {
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Kirigami.Units.largeSpacing
            Controls.Label {
                objectName: "header"
                Layout.fillWidth: true
                text: root.report ? qsTr("Quota · %1").arg(Model.ago(root.now - root.report.readAt)) : qsTr("Quota")
                font.bold: true
            }
            Controls.ToolButton {
                id: refreshButton
                objectName: "refreshButton"
                text: qsTr("Refresh now")
                icon.name: "view-refresh"
                display: Controls.AbstractButton.IconOnly
                onClicked: root.refresh(true)
                RotationAnimator on rotation {
                    running: root.manualReading
                    from: 0; to: 360; duration: 1000; loops: Animation.Infinite
                }
            }
            Controls.ToolButton {
                objectName: "settingsButton"
                text: qsTr("Settings")
                icon.name: "configure"
                display: Controls.AbstractButton.IconOnly
                onClicked: prefs.openSettings()
            }
        }
    }
    pageStack.globalToolBar.style: Kirigami.ApplicationHeaderStyle.None
    pageStack.initialPage: Kirigami.Page {
        padding: 0
        ColumnLayout {
            anchors.fill: parent
            spacing: 0
            Kirigami.InlineMessage {
                objectName: "errorBanner"
                Layout.fillWidth: true
                visible: root.readError !== null
                type: Kirigami.MessageType.Error
                text: root.readError ? [root.readError.title, root.readError.detail, root.readError.hint].filter(Boolean).join("\n") : ""
            }
            Kirigami.InlineMessage {
                Layout.fillWidth: true
                visible: text.length > 0
                text: root.settingErrors.concat(root.autostartError).filter(Boolean).join("\n")
                type: Kirigami.MessageType.Warning
            }
            Controls.ScrollView {
                id: scroll
                Layout.fillWidth: true
                Layout.fillHeight: true
                contentWidth: availableWidth
                Flickable {
                    objectName: "list"
                    clip: true
                    contentHeight: lanes.implicitHeight
                    boundsBehavior: Flickable.StopAtBounds
                    ColumnLayout {
                        id: lanes
                        width: scroll.availableWidth
                        spacing: 0
                        Repeater {
                            model: root.report ? Model.visibleLanes(root.report, root.options) : []
                            LaneCard {
                                required property var modelData
                                Layout.fillWidth: true
                                lane: modelData
                                name: root.names[lane.key] ?? lane.label
                                now: root.now
                                refreshMs: root.options.refreshMs
                                colors: root.colors
                            }
                        }
                    }
                }
            }
        }
    }
}
