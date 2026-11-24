// SPDX-License-Identifier: GPL-3.0-or-later
#include "fixture.h"
#include <QClipboard>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QProcessEnvironment>
#include <QGuiApplication>
#include <QJsonDocument>
#include <QJsonObject>
#include <QQmlContext>
#include <QQmlEngine>
#include <QSettings>

Fixture::Fixture()
{
    if (!m_dir.isValid())
        qFatal("Could not create the test directory.");
    for (const QString &subdir : {"bin", "home", "config", "data", "cache"})
        if (!QDir().mkpath(path(subdir)))
            qFatal("Could not create test subdirectory.");
    for (const QString &program : {"quota-axi", "fake-login-shell"}) {
        if (!QFile::copy(QStringLiteral(PEGEL_TEST_BIN_DIR "/") + program, path("bin/" + program)))
            qFatal("Could not install %s in the test directory.", qPrintable(program));
    }
    qputenv("PEGEL_FAKE_DIR", m_dir.path().toUtf8());
    qputenv("HOME", path("home").toUtf8());
    qputenv("XDG_CONFIG_HOME", path("config").toUtf8());
    qputenv("XDG_DATA_HOME", path("data").toUtf8());
    qputenv("XDG_CACHE_HOME", path("cache").toUtf8());
    // Exercise the cleanup without passing any real account configuration to the fixture.
    const auto inherited = QProcessEnvironment::systemEnvironment().keys();
    for (const auto &name : inherited)
        if (name.startsWith("QUOTA_AXI_"))
            qunsetenv(name.toUtf8().constData());
    for (const char *name : {"CLAUDE_CONFIG_DIR", "CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "QUOTA_AXI_MAX_AGE"})
        qputenv(name, "fixture");
    hideProgram(false);
}

void Fixture::reset()
{
    QSettings settings;
    settings.clear();
    settings.sync();
    for (const auto &name : {"fail.json", "config/autostart/pegel.desktop", "data/pegel/icons/claude.svg"})
        QFile::remove(path(name));
    hideProgram(false);
    setDelayMs(0);
    write("calls.log", {});
    write("home/.claude/.credentials.json", "{}");
    write("home/.claude-work/settings.json", "{}");
    setResponse(scenario());
}

QVariantMap Fixture::scenario() const
{
    QFile file(QStringLiteral(PEGEL_TEST_SCENARIO));
    if (!file.open(QIODevice::ReadOnly))
        qFatal("Cannot open the test scenario.");
    const auto doc = QJsonDocument::fromJson(file.readAll());
    if (!doc.isObject())
        qFatal("Invalid scenario JSON.");
    return doc.object().toVariantMap();
}

static QVariant resolveValue(const QVariant &value, const QDateTime &now, const QString &home)
{
    if (value.typeId() == QMetaType::QVariantMap) {
        auto map = value.toMap();
        for (auto it = map.begin(); it != map.end(); ++it)
            it.value() = resolveValue(it.value(), now, home);
        return map;
    }
    if (value.typeId() == QMetaType::QVariantList) {
        auto list = value.toList();
        for (auto &entry : list)
            entry = resolveValue(entry, now, home);
        return list;
    }
    if (value.typeId() == QMetaType::QString) {
        QString text = value.toString();
        if (text.startsWith("@+") || text.startsWith("@-")) {
            bool ok;
            const int seconds = text.mid(1).toInt(&ok);
            if (!ok)
                qFatal("Invalid relative time in test scenario.");
            return now.addSecs(seconds).toString(Qt::ISODateWithMs);
        }
        return text.replace("<HOME>", home);
    }
    return value;
}

void Fixture::setResponse(const QVariantMap &response)
{
    QFile::remove(path("fail.json"));
    auto resolved = resolveValue(response, QDateTime::currentDateTimeUtc(), path("home"));
    write("response.json", QString::fromUtf8(QJsonDocument::fromVariant(resolved).toJson()));
}

QVariantList Fixture::calls() const
{
    QVariantList calls;
    for (const auto &line : read("calls.log").split('\n', Qt::SkipEmptyParts)) {
        const auto doc = QJsonDocument::fromJson(line.toUtf8());
        if (!doc.isObject())
            qFatal("Invalid test invocation log.");
        calls.append(doc.object().toVariantMap());
    }
    return calls;
}

void Fixture::failWith(int code, const QString &stderrText)
{
    write("fail.json", QString::fromUtf8(QJsonDocument(QJsonObject{{"code", code}, {"stderr", stderrText}}).toJson()));
}

void Fixture::setDelayMs(int ms)
{
    write("delay", QString::number(ms));
}

void Fixture::hideProgram(bool hide)
{
    qputenv("PATH", path(hide ? "empty-bin" : "bin").toUtf8());
    qunsetenv("SHELL");
}

void Fixture::setSetting(const QString &key, const QVariant &value)
{
    QSettings settings;
    settings.setValue(key, value);
    settings.sync();
}

QString Fixture::path(const QString &name) const
{
    return m_dir.filePath(name);
}

QString Fixture::read(const QString &name) const
{
    QFile file(path(name));
    if (!file.open(QIODevice::ReadOnly))
        qFatal("Could not read %s", qPrintable(file.fileName()));
    return QString::fromUtf8(file.readAll());
}

void Fixture::write(const QString &name, const QString &text) const
{
    QFile file(path(name));
    const QByteArray bytes = text.toUtf8();
    if (!QDir().mkpath(QFileInfo(file).absolutePath()) || !file.open(QIODevice::WriteOnly | QIODevice::Truncate)
        || file.write(bytes) != bytes.size())
        qFatal("Could not write %s", qPrintable(file.fileName()));
}

bool Fixture::exists(const QString &name) const
{
    return QFile::exists(path(name));
}

QString Fixture::artifact(const QString &name) const
{
    QDir dir(QStringLiteral(PEGEL_TEST_ARTIFACT_DIR));
    if (!dir.mkpath("."))
        qFatal("Could not create artifact directory.");
    const QString lang = qEnvironmentVariable("PEGEL_TEST_LANGUAGE");
    return dir.filePath(lang.isEmpty() ? name : lang + '-' + name);
}

QString Fixture::clipboard() const
{
    return QGuiApplication::clipboard()->text();
}

void Fixture::qmlEngineAvailable(QQmlEngine *engine)
{
    engine->rootContext()->setContextProperty("fixture", this);
}
