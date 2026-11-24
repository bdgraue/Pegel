// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#include <KDBusService>
#include <QApplication>
#include <QCommandLineParser>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QLocale>
#include <QQuickStyle>
#include <QTranslator>
#include <QWindow>

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);
    QApplication::setApplicationName(QStringLiteral("pegel"));
    QApplication::setApplicationDisplayName(QStringLiteral("Pegel"));
    QApplication::setApplicationVersion(QStringLiteral(PEGEL_VERSION));
    // Registers on D-Bus as io.github.bdgraue.pegel.
    QApplication::setOrganizationDomain(QStringLiteral("bdgraue.github.io"));
    // Settings land in ~/.config/pegel/pegel.conf instead of a folder named after the domain.
    QApplication::setOrganizationName(QStringLiteral("pegel"));
    QApplication::setDesktopFileName(QStringLiteral("io.github.bdgraue.Pegel"));
    QApplication::setWindowIcon(QIcon(QStringLiteral(":/qt/qml/Pegel/data/pegel.svg")));
    // Closing the window only hides it; the tray icon keeps the app running.
    QApplication::setQuitOnLastWindowClosed(false);

    // Translations are compiled into the binary under :/i18n (qt_add_translations); a language without one stays English.
    QTranslator translator;
    if (translator.load(QLocale(), QStringLiteral("pegel"), QStringLiteral("_"), QStringLiteral(":/i18n"))) {
        QCoreApplication::installTranslator(&translator);
    }

    QCommandLineParser parser;
    parser.setApplicationDescription(QCoreApplication::translate("main", "AI coding quota of all your accounts, in the tray."));
    parser.addHelpOption();
    parser.addVersionOption();
    const QCommandLineOption hidden(QStringLiteral("hidden"), QCoreApplication::translate("main", "Show only the tray icon; the window stays hidden."));
    parser.addOption(hidden);
    parser.process(app);

    if (qEnvironmentVariableIsEmpty("QT_QUICK_CONTROLS_STYLE")) {
        QQuickStyle::setStyle(QStringLiteral("org.kde.desktop"));
    }

    // A second launch exits here and brings the running window to the front instead.
    KDBusService service(KDBusService::Unique);

    QQmlApplicationEngine engine;
    engine.setInitialProperties({{QStringLiteral("startHidden"), parser.isSet(hidden)}});
    engine.loadFromModule("Pegel", "Main");
    if (engine.rootObjects().isEmpty()) {
        return 1;
    }

    auto *window = qobject_cast<QWindow *>(engine.rootObjects().constFirst());
    if (!window) {
        qFatal("Main.qml ist kein Fenster.");
    }
    QObject::connect(&service, &KDBusService::activateRequested, window, [window] {
        window->show();
        window->raise();
        window->requestActivate();
    });

    return app.exec();
}
