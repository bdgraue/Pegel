// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#include "launcher.h"

#include <QClipboard>
#include <QDir>
#include <QFileInfo>
#include <QGuiApplication>
#include <QSaveFile>
#include <QStandardPaths>

namespace {
QString autostartFile()
{
    return QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation) + "/autostart/pegel.desktop";
}

// Exec has two escaping layers: Desktop Entry string decoding, then argument unquoting.
QString desktopExec(QString path)
{
    path.replace('\\', "\\\\");
    for (const QChar character : QStringLiteral("\"$`")) {
        path.replace(character, QStringLiteral("\\") + character);
    }
    path.replace('\\', "\\\\");
    path.replace('%', "%%");
    path.replace('\n', "\\n");
    path.replace('\r', "\\r");
    return '"' + path + '"';
}
}

QString Launcher::version() const
{
    return QCoreApplication::applicationVersion();
}

bool Launcher::autostart() const
{
    return QFileInfo::exists(autostartFile());
}

void Launcher::setAutostart(bool enabled)
{
    if (enabled == autostart()) {
        return;
    }
    const QString path = autostartFile();
    if (!enabled) {
        if (!QFile::remove(path)) {
            Q_EMIT autostartFailed(tr("%1 could not be removed.").arg(path));
        }
    } else if (!QDir().mkpath(QFileInfo(path).absolutePath())) {
        Q_EMIT autostartFailed(tr("The folder for %1 could not be created.").arg(path));
    } else {
        QSaveFile file(path);
        const QByteArray entry = QStringLiteral("[Desktop Entry]\nType=Application\nName=Pegel\nExec=%1 --hidden\n"
                                                "Icon=io.github.bdgraue.Pegel\nX-GNOME-Autostart-enabled=true\n")
                                     .arg(desktopExec(QCoreApplication::applicationFilePath())).toUtf8();
        if (!file.open(QIODevice::WriteOnly) || file.write(entry) != entry.size() || !file.commit()) {
            Q_EMIT autostartFailed(tr("%1 could not be written: %2").arg(path, file.errorString()));
        }
    }
    Q_EMIT autostartChanged();
}

void Launcher::copy(const QString &text)
{
    QGuiApplication::clipboard()->setText(text);
}
