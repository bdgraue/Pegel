// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#pragma once

#include <QJSValue>
#include <QObject>
#include <QUrl>
#include <QVariantMap>
#include <QtQml/qqmlregistration.h>

class Quota : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
public:
    using QObject::QObject;
    Q_INVOKABLE void run(const QString &program, const QStringList &args, const QVariantMap &env,
                         const QJSValue &callback, int timeoutMs);
    Q_INVOKABLE QString findProgram(const QString &name) const;
    Q_INVOKABLE QString loginShell() const;
    Q_INVOKABLE QVariantList claudeCandidates(const QStringList &manual) const;
    Q_INVOKABLE QUrl providerIcon(const QString &provider) const;
};
