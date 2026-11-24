// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#include "quota.h"

#include <QDir>
#include <QFileInfo>
#include <QProcess>
#include <QQmlEngine>
#include <QStandardPaths>
#include <QTimer>
#include <algorithm>

void Quota::run(const QString &program, const QStringList &args, const QVariantMap &env,
                const QJSValue &callback, int timeoutMs)
{
    if (!callback.isCallable() || timeoutMs <= 0) {
        qmlEngine(this)->throwError(tr("Quota.run requires a callback and a positive timeout."));
        return;
    }
    auto environment = QProcessEnvironment::systemEnvironment();
    const auto prefixes = env.value("removePrefixes").toStringList();
    const auto remove = env.value("remove").toStringList();
    for (const QString &key : environment.keys()) {
        if (remove.contains(key) || std::any_of(prefixes.cbegin(), prefixes.cend(),
                                                [&key](const QString &prefix) { return key.startsWith(prefix); })) {
            environment.remove(key);
        }
    }
    const auto set = env.value("set").toMap();
    for (auto it = set.cbegin(); it != set.cend(); ++it) {
        environment.insert(it.key(), it.value().toString());
    }

    auto *process = new QProcess(this);
    process->setStandardInputFile(QProcess::nullDevice());
    process->setProcessEnvironment(environment);
    const auto finish = [process, callback](int code, const QString &out, const QString &err) {
        process->deleteLater();
        callback.call({code, out, err});
    };
    const bool viaShell = args == QStringList{"-lic", "exec quota-axi --json --full"};
    connect(process, &QProcess::finished, this,
            [process, finish, resolving = viaShell](int code, QProcess::ExitStatus status) mutable {
        const QByteArray out = process->readAllStandardOutput();
        const QString err = QString::fromUtf8(process->readAllStandardError());
        if (process->property("timedOut").toBool()) {
            finish(-1, {}, tr("quota-axi did not answer and was stopped."));
        } else if (status == QProcess::CrashExit) {
            finish(-1, {}, err.isEmpty() ? tr("The process crashed.") : err);
        } else if (resolving) {
            // Login files can export credentials again. Use only the PATH between NUL markers.
            const auto fields = out.split('\0');
            if (code || fields.size() != 3 || fields[1].isEmpty()) {
                finish(-2, {}, err.isEmpty() ? tr("The login shell did not return a search path.") : err);
                return;
            }
            const QString path = QString::fromLocal8Bit(fields[1]);
            const QString executable = QStandardPaths::findExecutable("quota-axi", path.split(':'));
            if (executable.isEmpty()) {
                finish(-2, {}, tr("quota-axi was not found."));
                return;
            }
            resolving = false;
            auto childEnv = process->processEnvironment();
            childEnv.insert("PATH", path);
            process->setProcessEnvironment(childEnv);
            process->start(executable, {"--json", "--full"});
        } else {
            finish(code, QString::fromUtf8(out), err);
        }
    });
    connect(process, &QProcess::errorOccurred, this, [process, finish](QProcess::ProcessError error) {
        if (error == QProcess::FailedToStart) {
            finish(-2, {}, process->errorString());
        }
    });
    QTimer::singleShot(timeoutMs, process, [process] {
        if (process->state() != QProcess::NotRunning) {
            process->setProperty("timedOut", true);
            process->kill();
        }
    });
    process->start(program, viaShell ? QStringList{"-lic", R"(exec /usr/bin/printf '\0%s\0' "$PATH")"} : args);
}

QString Quota::findProgram(const QString &name) const
{
    return QStandardPaths::findExecutable(name);
}

QString Quota::loginShell() const
{
    return qEnvironmentVariable("SHELL");
}

QVariantList Quota::claudeCandidates(const QStringList &manual) const
{
    const QDir home = QDir::home();
    QVariantList result;
    const auto append = [&result](const QString &path, bool manual) {
        const QFileInfo info(path);
        const QDir dir(info.absoluteFilePath());
        const QString canonical = info.canonicalFilePath();
        result.append(QVariantMap{
            {"path", info.absoluteFilePath()}, {"canonicalPath", canonical.isEmpty() ? info.absoluteFilePath() : canonical},
            {"isDir", info.isDir()}, {"manual", manual},
            {"hasCredentials", QFileInfo(dir.filePath(".credentials.json")).isFile()},
            {"hasSettings", QFileInfo(dir.filePath("settings.json")).isFile()},
            {"hasProjects", QFileInfo(dir.filePath("projects")).isDir()}
        });
    };
    append(home.filePath(".claude"), false);
    for (const QString &folder : home.entryList({".claude-*"}, QDir::Dirs | QDir::Hidden, QDir::Name)) {
        append(home.filePath(folder), false);
    }
    for (const QString &folder : manual) {
        if (!folder.trimmed().isEmpty()) {
            append(folder == "~" ? home.absolutePath() : folder.startsWith("~/") ? home.filePath(folder.mid(2)) : folder, true);
        }
    }
    return result;
}

QUrl Quota::providerIcon(const QString &provider) const
{
    if (provider.isEmpty() || provider.contains('/')) {
        return {};
    }
    const QString path = QStandardPaths::locate(QStandardPaths::GenericDataLocation,
                                                "pegel/icons/" + provider + ".svg");
    return path.isEmpty() ? QUrl{} : QUrl::fromLocalFile(path);
}
