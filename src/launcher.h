// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#pragma once

#include <QObject>
#include <QtQml/qqmlregistration.h>

class Launcher : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    Q_PROPERTY(QString version READ version CONSTANT)
    Q_PROPERTY(bool autostart READ autostart WRITE setAutostart NOTIFY autostartChanged)
public:
    using QObject::QObject;
    QString version() const;
    bool autostart() const;
    void setAutostart(bool enabled);
    Q_INVOKABLE void copy(const QString &text);

Q_SIGNALS:
    void autostartChanged();
    void autostartFailed(const QString &message);
};
