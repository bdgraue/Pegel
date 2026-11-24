// SPDX-License-Identifier: GPL-3.0-or-later
import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

ColumnLayout {
    id: row
    required property string rowKey
    required property var view
    required property var colors
    objectName: "window:" + rowKey
    opacity: view.dimmed ? 0.5 : 1
    spacing: 0
    Layout.leftMargin: view.indent ? Kirigami.Units.largeSpacing : 0
    RowLayout {
        Layout.fillWidth: true
        Controls.Label {
            Layout.maximumWidth: Kirigami.Units.gridUnit * 7
            text: row.view.label
            wrapMode: Text.Wrap
        }
        Loader {
            Layout.fillWidth: true
            Layout.preferredHeight: Kirigami.Units.smallSpacing * 2
            active: row.view.fill !== null
            sourceComponent: Rectangle {
                objectName: "bar:" + row.rowKey
                radius: height / 2
                color: Kirigami.Theme.alternateBackgroundColor
                border.width: 1
                border.color: Kirigami.Theme.disabledTextColor
                Rectangle {
                    height: parent.height
                    width: parent.width * (row.view.fill ?? 0)
                    color: row.colors[row.view.level ?? 0]
                    radius: parent.radius
                }
                Rectangle {
                    visible: row.view.elapsed !== null
                    x: Math.round((parent.width - width) * (row.view.elapsed ?? 0))
                    anchors.verticalCenter: parent.verticalCenter
                    width: 2
                    height: parent.height + 4
                    color: Kirigami.Theme.textColor
                }
            }
        }
        Controls.Label {
            objectName: "percent:" + row.rowKey
            text: row.view.percentText
            horizontalAlignment: Text.AlignRight
        }
    }
    Controls.Label {
        objectName: "detail:" + row.rowKey
        Layout.fillWidth: true
        visible: text.length > 0
        text: row.view.detail
        font: Kirigami.Theme.smallFont
        wrapMode: Text.Wrap
    }
}
