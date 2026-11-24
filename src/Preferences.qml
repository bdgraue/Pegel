// SPDX-License-Identifier: GPL-3.0-or-later
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import Pegel
import "model.mjs" as Model

Kirigami.Dialog {
    id: dialog
    objectName: "preferences"
    required property var settings
    required property var parsed
    required property var report
    property var accounts: []
    property var defaultNames: ({})
    property var folders: []
    property var manual: []
    property var disabled: []
    property string profileError: ""
    readonly property var kindLabels: ({ session: qsTr("5 hours"), weekly: qsTr("Week"), monthly: qsTr("Month"),
        model: qsTr("Model limits"), other: qsTr("Other limits") })
    signal readRequested()

    function updateSetting(key, value) {
        if (JSON.stringify(value) === JSON.stringify(parsed[key].value))
            return false
        settings[key] = JSON.stringify(value)
        return true
    }
    function toggle(array, key, include) {
        const index = array.indexOf(key)
        if (include && index < 0)
            array.push(key)
        else if (!include && index >= 0)
            array.splice(index, 1)
    }
    function collectDisabled() {
        const result = disabled.slice()
        for (let i = 0; i < folderRows.count; ++i) {
            const entry = folderRows.itemAt(i)
            toggle(result, entry.modelData, !entry.checked)
        }
        return result
    }
    function addFolder() {
        const path = addField.text.trim()
        if (!path)
            return
        const discovered = Model.claudeProfiles(Quota.claudeCandidates([path]), [])
        if (discovered.rejected.length) {
            profileError = discovered.rejected[0].reason
            return
        }
        const next = manual.includes(path) ? manual : manual.concat([path])
        disabled = collectDisabled()
        manual = next
        folders = Model.claudeProfiles(Quota.claudeCandidates(next), []).dirs
        profileError = ""
        addField.clear()
    }
    function openSettings() {
        interval.value = settings.refreshMinutes
        notify.checked = settings.notify
        threshold.value = settings.threshold
        showNotSetUp.checked = settings.showNotSetUp
        pathField.text = settings.quotaPath
        autostart.checked = Launcher.autostart
        accounts = report ? report.lanes.slice() : []
        defaultNames = Model.laneNames(accounts, {})
        manual = parsed.claudeManual.value.slice()
        disabled = parsed.claudeDisabled.value.slice()
        folders = Model.claudeProfiles(Quota.claudeCandidates(manual), []).dirs
        for (let i = 0; i < kinds.count; ++i) {
            const row = kinds.itemAt(i)
            row.checked = !!parsed.kinds.value[row.modelData]
        }
        for (let i = 0; i < accountRows.count; ++i) {
            const row = accountRows.itemAt(i)
            row.checked = !parsed.hidden.value.includes(row.modelData.key)
            row.name = parsed.names.value[row.modelData.key] ?? ""
        }
        for (let i = 0; i < folderRows.count; ++i) {
            const row = folderRows.itemAt(i)
            row.checked = !disabled.includes(row.modelData)
        }
        profileError = ""
        addField.clear()
        open()
    }
    title: qsTr("Settings")
    standardButtons: Kirigami.Dialog.Ok | Kirigami.Dialog.Cancel
    y: Kirigami.Units.largeSpacing
    preferredWidth: Kirigami.Units.gridUnit * 26
    padding: Kirigami.Units.largeSpacing
    onAccepted: {
        const hidden = parsed.hidden.value.slice()
        const names = Object.assign({}, parsed.names.value)
        for (let i = 0; i < accountRows.count; ++i) {
            const row = accountRows.itemAt(i)
            const key = row.modelData.key
            toggle(hidden, key, !row.checked)
            if (row.name.trim())
                names[key] = row.name.trim()
            else
                delete names[key]
        }
        const selected = Object.assign({}, parsed.kinds.value)
        for (let i = 0; i < kinds.count; ++i) {
            const row = kinds.itemAt(i)
            if (row.checked !== !!selected[row.modelData])
                selected[row.modelData] = row.checked
        }
        updateSetting("hidden", hidden)
        updateSetting("names", names)
        updateSetting("kinds", selected)
        settings.refreshMinutes = interval.value
        settings.notify = notify.checked
        settings.threshold = threshold.value
        settings.showNotSetUp = showNotSetUp.checked
        const manualChanged = updateSetting("claudeManual", manual)
        const disabledChanged = updateSetting("claudeDisabled", collectDisabled())
        const pathChanged = settings.quotaPath !== pathField.text.trim()
        settings.quotaPath = pathField.text.trim()
        if (Launcher.autostart !== autostart.checked)
            Launcher.autostart = autostart.checked
        if (manualChanged || disabledChanged || pathChanged)
            readRequested()
    }

    ColumnLayout {
        spacing: Kirigami.Units.smallSpacing
        Controls.Label { text: qsTr("Read every") }
        RowLayout {
            Controls.SpinBox { id: interval; objectName: "intervalField"; from: 1; to: 60; editable: true }
            Controls.Label { text: qsTr("minutes") }
        }
        RowLayout {
            Controls.CheckBox { id: notify; objectName: "notifyBox"; text: qsTr("Notify at") }
            Controls.SpinBox { id: threshold; objectName: "thresholdField"; from: 50; to: 99; editable: true; enabled: notify.checked }
            Controls.Label { text: "%" }
        }
        Kirigami.Heading {
            Layout.fillWidth: true
            level: 4
            wrapMode: Text.Wrap
            text: qsTr("Count for the tray icon and notifications")
        }
        Repeater {
            id: kinds
            model: Object.keys(dialog.kindLabels)
            Controls.CheckBox {
                required property string modelData
                objectName: "kind:" + modelData
                text: dialog.kindLabels[modelData]
            }
        }
        Kirigami.Heading { level: 4; text: qsTr("Accounts") }
        Repeater {
            id: accountRows
            model: dialog.accounts
            ColumnLayout {
                id: account
                required property var modelData
                property alias checked: shown.checked
                property alias name: nameField.text
                Layout.fillWidth: true
                spacing: 0
                Controls.CheckBox {
                    id: shown
                    objectName: "laneVisible:" + account.modelData.key
                    text: dialog.defaultNames[account.modelData.key] ?? account.modelData.label
                }
                Controls.TextField {
                    id: nameField
                    Layout.fillWidth: true
                    objectName: "laneNameField:" + account.modelData.key
                    placeholderText: dialog.defaultNames[account.modelData.key] ?? account.modelData.label
                }
            }
        }
        Kirigami.Heading { level: 4; text: qsTr("Claude profile folders") }
        Repeater {
            id: folderRows
            model: dialog.folders
            RowLayout {
                id: folder
                required property string modelData
                property alias checked: folderCheck.checked
                Layout.fillWidth: true
                Controls.CheckBox {
                    id: folderCheck
                    objectName: "profile:" + folder.modelData
                    Accessible.name: folder.modelData
                    checked: !dialog.disabled.includes(folder.modelData)
                }
                Controls.Label {
                    Layout.fillWidth: true
                    wrapMode: Text.WrapAnywhere
                    text: folder.modelData
                    TapHandler { onTapped: folderCheck.toggle() }
                }
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Controls.TextField { id: addField; objectName: "profileAddField"; Layout.fillWidth: true; onAccepted: dialog.addFolder() }
            Controls.ToolButton {
                objectName: "profileAddButton"
                text: qsTr("Add folder")
                icon.name: "list-add"
                display: Controls.AbstractButton.IconOnly
                onClicked: dialog.addFolder()
            }
        }
        Controls.Label {
            objectName: "profileError"
            visible: text.length > 0
            Layout.fillWidth: true
            wrapMode: Text.Wrap
            text: dialog.profileError
            color: Kirigami.Theme.negativeTextColor
        }
        RowLayout {
            Layout.fillWidth: true
            Controls.CheckBox { id: showNotSetUp; objectName: "showNotSetUpBox"; Accessible.name: showLabel.text }
            Controls.Label {
                id: showLabel
                Layout.fillWidth: true
                wrapMode: Text.Wrap
                text: qsTr("Show providers that are not set up (%1)").arg(dialog.report ? Model.notSetUpCount(dialog.report) : 0)
                TapHandler { onTapped: showNotSetUp.toggle() }
            }
        }
        Controls.Label { text: qsTr("Path to quota-axi") }
        Controls.TextField {
            id: pathField
            objectName: "quotaPathField"
            Layout.fillWidth: true
            placeholderText: qsTr("found automatically")
        }
        Controls.CheckBox { id: autostart; objectName: "autostartBox"; text: qsTr("Start with the session") }
    }
}
