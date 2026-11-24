// SPDX-License-Identifier: GPL-3.0-or-later
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import Pegel
import "model.mjs" as Model

ColumnLayout {
    id: card
    required property var lane
    required property string name
    required property real now
    required property int refreshMs
    required property var colors
    readonly property var problem: Model.laneProblem(lane, now)
    readonly property url logo: Quota.providerIcon(lane.provider)
    objectName: "lane:" + lane.key
    opacity: Model.isOld(lane, now, refreshMs) ? 0.6 : 1
    spacing: 0
    ColumnLayout {
        Layout.fillWidth: true
        Layout.margins: Kirigami.Units.largeSpacing
        spacing: Kirigami.Units.smallSpacing
        RowLayout {
            Layout.fillWidth: true
            Item {
                implicitWidth: Kirigami.Units.iconSizes.smallMedium
                implicitHeight: implicitWidth
                Rectangle {
                    anchors.fill: parent
                    radius: width / 2
                    visible: image.status !== Image.Ready
                    color: {
                        const palette = ["#346488", "#794f71", "#406d66", "#8b5a39", "#62588f", "#466281"]
                        let hash = 0
                        for (let i = 0; i < card.lane.provider.length; ++i)
                            hash = (hash * 31 + card.lane.provider.charCodeAt(i)) >>> 0
                        return palette[hash % palette.length]
                    }
                    Controls.Label {
                        anchors.centerIn: parent
                        text: card.lane.label.slice(0, 1).toUpperCase()
                        color: "white"
                        font.bold: true
                    }
                }
                Image { id: image; anchors.fill: parent; source: card.logo; fillMode: Image.PreserveAspectFit }
            }
            Controls.Label {
                objectName: "laneName:" + card.lane.key
                Layout.fillWidth: true
                font.bold: true
                wrapMode: Text.Wrap
                text: card.name
                HoverHandler { id: hover }
                Controls.ToolTip.visible: hover.hovered && Controls.ToolTip.text.length > 0
                Controls.ToolTip.text: [card.lane.email, card.lane.organization].filter(Boolean).join("\n")
            }
            Controls.Label {
                objectName: "lanePlan:" + card.lane.key
                Layout.maximumWidth: card.width / 3
                wrapMode: Text.Wrap
                text: Model.planText(card.lane)
            }
        }
        Controls.Label {
            objectName: "laneSummary:" + card.lane.key
            Layout.fillWidth: true
            visible: text.length > 0
            wrapMode: Text.Wrap
            text: Model.laneSummary(card.lane, card.now)
        }
        Controls.Label {
            objectName: "laneAge:" + card.lane.key
            Layout.fillWidth: true
            visible: text.length > 0
            wrapMode: Text.Wrap
            text: Model.laneAge(card.lane, card.now, card.refreshMs)
        }
        Controls.Label {
            Layout.fillWidth: true
            visible: text.length > 0
            wrapMode: Text.Wrap
            text: Model.creditsText(card.lane)
        }
        Repeater {
            model: card.lane.windows
            WindowRow {
                required property var modelData
                Layout.fillWidth: true
                rowKey: card.lane.key + ":" + modelData.id
                view: Model.windowView(card.lane, modelData, card.now, card.refreshMs)
                colors: card.colors
            }
        }
        Controls.Label {
            objectName: "laneProblem:" + card.lane.key
            Layout.fillWidth: true
            visible: !!card.problem
            wrapMode: Text.Wrap
            textFormat: Text.PlainText
            text: card.problem?.text ?? ""
        }
        RowLayout {
            visible: !!card.problem?.command
            Layout.fillWidth: true
            Controls.Label {
                Layout.fillWidth: true
                wrapMode: Text.WrapAnywhere
                font.family: "monospace"
                textFormat: Text.PlainText
                text: card.problem?.command ?? ""
            }
            Controls.ToolButton {
                objectName: "copy:" + card.lane.key
                text: qsTr("Copy command")
                icon.name: "edit-copy"
                display: Controls.AbstractButton.IconOnly
                onClicked: Launcher.copy(card.problem.command)
            }
        }
    }
    Kirigami.Separator { Layout.fillWidth: true }
}
