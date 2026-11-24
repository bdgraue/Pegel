// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <QObject>
#include <QTemporaryDir>
#include <QVariantMap>
class QQmlEngine;

class Fixture : public QObject
{
    Q_OBJECT
public:
    Fixture();
    Q_INVOKABLE void reset();
    Q_INVOKABLE QVariantList calls() const;
    Q_INVOKABLE QVariantMap scenario() const;
    Q_INVOKABLE void setResponse(const QVariantMap &response);
    Q_INVOKABLE void failWith(int code, const QString &stderrText);
    Q_INVOKABLE void setDelayMs(int ms);
    Q_INVOKABLE void hideProgram(bool hide);
    Q_INVOKABLE void setSetting(const QString &key, const QVariant &value);
    Q_INVOKABLE QString path(const QString &name) const;
    Q_INVOKABLE QString read(const QString &name) const;
    Q_INVOKABLE void write(const QString &name, const QString &text) const;
    Q_INVOKABLE bool exists(const QString &name) const;
    Q_INVOKABLE QString artifact(const QString &name) const;
    Q_INVOKABLE QString clipboard() const;
public Q_SLOTS:
    void qmlEngineAvailable(QQmlEngine *engine);
private:
    QTemporaryDir m_dir;
};
