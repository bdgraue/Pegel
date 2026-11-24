// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#include "fixture.h"

#include <QApplication>
#include <QIcon>
#include <QQuickStyle>
#include <QTranslator>
#include <QtQuickTest/quicktest.h>

int main(int argc, char *argv[])
{
    // The tests never show a window on the desktop they run on and look the same everywhere.
    qputenv("QT_QPA_PLATFORM", "offscreen");
    qputenv("QT_QUICK_BACKEND", "software");
    for (const char *name : {"XDG_CURRENT_DESKTOP", "KDE_FULL_SESSION", "KDE_SESSION_VERSION", "QT_QPA_PLATFORMTHEME", "LANGUAGE"}) {
        qunsetenv(name);
    }
    qputenv("LC_ALL", "C.UTF-8");

    qputenv("TZ", "UTC");
    Fixture fixture;

    // The same application object and style as src/main.cpp; the desktop style needs QApplication.
    QApplication app(argc, argv);
    QApplication::setApplicationName(QStringLiteral("pegel"));
    QApplication::setOrganizationName(QStringLiteral("pegel"));
    QApplication::setApplicationVersion(QStringLiteral("0.0.0"));
    QApplication::setQuitOnLastWindowClosed(false);
    QQuickStyle::setStyle(QStringLiteral("org.kde.desktop"));
    QIcon::setThemeName(QStringLiteral("breeze"));

    // The tests compare English texts, the source language. PEGEL_TEST_LANGUAGE=de loads a translation instead, for
    // looking at the screenshots of test_screenshots in that language; the other tests then fail on their texts.
    QTranslator translator;
    const QString language = qEnvironmentVariable("PEGEL_TEST_LANGUAGE");
    if (!language.isEmpty()) {
        if (!translator.load(QStringLiteral(PEGEL_TEST_QM_DIR "/pegel_%1.qm").arg(language))) {
            qFatal("No translation for %s in %s.", qPrintable(language), PEGEL_TEST_QM_DIR);
        }
        QApplication::installTranslator(&translator);
    }

    return quick_test_main_with_setup(argc, argv, "pegel-ui", QUICK_TEST_SOURCE_DIR, &fixture);
}
