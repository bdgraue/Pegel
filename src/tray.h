// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#pragma once

#include <QObject>
#include <QImage>
#include <QPointer>
#include <QWindow>
#include <QtQml/qqmlregistration.h>

class KStatusNotifierItem;

class Tray : public QObject
{
    Q_OBJECT
    QML_ELEMENT
    Q_PROPERTY(QWindow *window READ window WRITE setWindow NOTIFY windowChanged)
    Q_PROPERTY(QString subtitle READ subtitle WRITE setSubtitle NOTIFY subtitleChanged)
    Q_PROPERTY(bool warning READ warning WRITE setWarning NOTIFY warningChanged)

    Q_PROPERTY(qreal fill READ fill WRITE setFill NOTIFY fillChanged)
    Q_PROPERTY(QColor color READ color WRITE setColor NOTIFY colorChanged)
public:
    explicit Tray(QObject *parent = nullptr);

    QWindow *window() const;
    void setWindow(QWindow *window);
    QString subtitle() const;
    void setSubtitle(const QString &subtitle);
    bool warning() const;
    void setWarning(bool warning);

    Q_INVOKABLE void notify(const QString &title, const QString &body, const QString &iconName);

    qreal fill() const { return m_fill; }
    QColor color() const { return m_color; }
    void setFill(qreal fill);
    void setColor(const QColor &color);
    Q_INVOKABLE QImage iconImage(int size) const;
    Q_INVOKABLE QColor iconPixel(int size, int x, int y) const;

Q_SIGNALS:
    void fillChanged();
    void colorChanged();
    void refreshRequested();
    void settingsRequested();
    // Every notification Pegel shows, as it was handed to the desktop.
    void notified(const QString &title, const QString &body, const QString &iconName);
    void windowChanged();
    void subtitleChanged();
    void warningChanged();

private:
    KStatusNotifierItem *m_item;
    QPointer<QWindow> m_window;
    QString m_subtitle;
    bool m_warning = false;
    qreal m_fill = -1;
    QColor m_color = Qt::gray;
    void updateIcon();
};
