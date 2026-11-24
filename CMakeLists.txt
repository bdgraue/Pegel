# SPDX-License-Identifier: GPL-3.0-or-later

cmake_minimum_required(VERSION 3.21)
project(pegel VERSION 0.1.0 LANGUAGES CXX
    DESCRIPTION "AI coding quota in the system tray"
    HOMEPAGE_URL "https://github.com/bdgraue/Pegel")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Gui Widgets Qml Quick QuickControls2 LinguistTools)
find_package(KF6StatusNotifierItem REQUIRED)
find_package(KF6DBusAddons REQUIRED)
find_package(KF6Kirigami REQUIRED)

qt_standard_project_setup(REQUIRES 6.5)

# The app's QML module and C++ types live in a static library, so the UI tests link the same code as the app.
qt_add_library(pegelcore STATIC)

# NO_CACHEGEN: compiled QML links Qt's private API, which ties the package to one exact Qt patch release
# (qt6-declarative-private-abi) and breaks it on every distribution Qt update. Pegel's QML is small enough to compile at start.
qt_add_qml_module(pegelcore
    URI Pegel
    VERSION 1.0
    NO_CACHEGEN
    QML_FILES src/Main.qml src/LaneCard.qml src/WindowRow.qml src/Preferences.qml src/model.mjs
    SOURCES src/quota.h src/quota.cpp src/launcher.h src/launcher.cpp src/tray.h src/tray.cpp
    RESOURCES data/pegel.svg
)

target_include_directories(pegelcore PUBLIC src)
target_link_libraries(pegelcore PUBLIC
    Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Qml Qt6::Quick Qt6::QuickControls2
    KF6::StatusNotifierItem
)

qt_add_executable(pegel src/main.cpp)
target_compile_definitions(pegel PRIVATE PEGEL_VERSION="${PROJECT_VERSION}")
# Linking the plugin target also registers the statically linked QML module.
target_link_libraries(pegel PRIVATE pegelcore pegelcoreplugin KF6::DBusAddons)

# Every i18n/pegel_<language>.ts is compiled into the binary; a new language needs only its file (see README).
# `cmake --build build --target update_translations` adds new source texts to all of them.
file(GLOB PEGEL_TS_FILES CONFIGURE_DEPENDS "${CMAKE_SOURCE_DIR}/i18n/pegel_*.ts")
qt_add_translations(pegel
    TS_FILES ${PEGEL_TS_FILES}
    SOURCE_TARGETS pegel pegelcore
    LUPDATE_OPTIONS -no-obsolete -locations none
)

include(CTest)
if(BUILD_TESTING)
    add_subdirectory(tests/ui)
endif()

include(GNUInstallDirs)
install(TARGETS pegel RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
install(FILES data/io.github.bdgraue.Pegel.desktop DESTINATION ${CMAKE_INSTALL_DATADIR}/applications)
install(FILES data/io.github.bdgraue.Pegel.metainfo.xml DESTINATION ${CMAKE_INSTALL_DATADIR}/metainfo)
install(FILES data/pegel.svg DESTINATION ${CMAKE_INSTALL_DATADIR}/icons/hicolor/scalable/apps RENAME io.github.bdgraue.Pegel.svg)

# `cpack -G DEB` in the build directory packages exactly what `cmake --install` installs.
set(CPACK_PACKAGE_NAME pegel)
set(CPACK_PACKAGE_VENDOR "Pegel contributors")
set(CPACK_PACKAGE_CONTACT "bdgraue <bdgraue@users.noreply.github.com>")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "${PROJECT_DESCRIPTION}")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_SOURCE_DIR}/LICENSE")
set(CPACK_PACKAGING_INSTALL_PREFIX /usr)
set(CPACK_DEBIAN_FILE_NAME DEB-DEFAULT)
set(CPACK_DEBIAN_PACKAGE_SECTION utils)
set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "${PROJECT_HOMEPAGE_URL}")
set(CPACK_DEBIAN_PACKAGE_SHLIBDEPS ON)
# QML modules are loaded at runtime, so dpkg-shlibdeps cannot see them.
set(CPACK_DEBIAN_PACKAGE_DEPENDS
    "qml6-module-org-kde-kirigami, qml6-module-org-kde-desktop, qml6-module-qtquick, qml6-module-qtquick-controls, qml6-module-qtquick-layouts, qml6-module-qtquick-templates, qml6-module-qtcore, qml6-module-qtqml, qml6-module-qtqml-models")
include(CPack)
