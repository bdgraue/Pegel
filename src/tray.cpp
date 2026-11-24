// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

#include "tray.h"

#include <KStatusNotifierItem>
#include <QIcon>
#include <QMenu>
#include <QPainter>
#include <QPainterPath>

Tray::Tray(QObject *parent)
    : QObject(parent)
    , m_item(new KStatusNotifierItem(QStringLiteral("pegel"), this))
{
    m_item->setTitle(QStringLiteral("Pegel"));
    m_item->setCategory(KStatusNotifierItem::ApplicationStatus);
    m_item->setStatus(KStatusNotifierItem::Active);
    updateIcon();
    QMenu *menu = m_item->contextMenu();
    QAction *before = menu->actions().value(0);
    const auto add = [menu, before, this](const QString &label, auto signal) {
        auto *action = new QAction(label, menu);
        connect(action, &QAction::triggered, this, signal);
        menu->insertAction(before, action);
    };
    add(tr("Refresh now"), &Tray::refreshRequested);
    add(tr("Settings"), &Tray::settingsRequested);
    menu->insertSeparator(before);
    m_item->setToolTipTitle(QStringLiteral("Pegel"));
}

QWindow *Tray::window() const
{
    return m_window;
}

void Tray::setWindow(QWindow *window)
{
    if (m_window == window) {
        return;
    }
    m_window = window;
    // With an associated window a left click on the tray icon shows or hides it.
    m_item->setAssociatedWindow(window);
    Q_EMIT windowChanged();
}

QString Tray::subtitle() const
{
    return m_subtitle;
}

void Tray::setSubtitle(const QString &subtitle)
{
    if (m_subtitle == subtitle) {
        return;
    }
    m_subtitle = subtitle;
    m_item->setToolTipSubTitle(subtitle);
    Q_EMIT subtitleChanged();
}

bool Tray::warning() const
{
    return m_warning;
}

void Tray::setWarning(bool warning)
{
    if (m_warning == warning) {
        return;
    }
    m_warning = warning;
    m_item->setOverlayIconByName(warning ? QStringLiteral("dialog-warning") : QString());
    Q_EMIT warningChanged();
}

void Tray::notify(const QString &title, const QString &body, const QString &iconName)
{
    m_item->showMessage(title, body, iconName);
    Q_EMIT notified(title, body, iconName);
}

void Tray::setFill(qreal fill)
{
    if (fill == m_fill) {
        return;
    }
    m_fill = fill;
    updateIcon();
    Q_EMIT fillChanged();
}

void Tray::setColor(const QColor &color)
{
    if (color == m_color) {
        return;
    }
    m_color = color;
    updateIcon();
    Q_EMIT colorChanged();
}

QImage Tray::iconImage(int size) const
{
    if (size <= 0) {
        return {};
    }
    QImage image(size, size, QImage::Format_ARGB32_Premultiplied);
    image.fill(Qt::transparent);
    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.scale(size / 64.0, size / 64.0);
    const QRectF bounds(14, 4, 36, 56);
    QPainterPath outline;
    outline.addRoundedRect(bounds, 6, 6);
    if (m_fill > 0) {
        painter.save();
        painter.setClipPath(outline);
        const qreal height = bounds.height() * qBound(0.0, m_fill, 1.0);
        painter.fillRect(QRectF(bounds.left(), bounds.bottom() - height, bounds.width(), height), m_color);
        painter.restore();
    }
    painter.strokePath(outline, QPen(QColor(128, 128, 128), 3));
    return image;
}

QColor Tray::iconPixel(int size, int x, int y) const
{
    return iconImage(size).pixelColor(x, y);
}

void Tray::updateIcon()
{
    QIcon icon;
    for (int size : {16, 22, 24, 32, 48, 64, 128}) {
        icon.addPixmap(QPixmap::fromImage(iconImage(size)));
    }
    m_item->setIconByPixmap(icon);
}
