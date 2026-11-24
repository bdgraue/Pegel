# SPDX-License-Identifier: GPL-3.0-or-later

# UI tests: the real Main.qml and C++ types against a fake quota-axi, offscreen and on a private D-Bus
# session, so they neither show a window nor reach the tray, the notifications of this machine.
find_package(Qt6 REQUIRED COMPONENTS QuickTest)
find_program(PEGEL_DBUS_RUN_SESSION dbus-run-session REQUIRED)
find_program(PEGEL_NODE node REQUIRED)

qt_add_executable(pegel_uitest main.cpp fixture.h fixture.cpp)
target_compile_definitions(pegel_uitest PRIVATE
    QUICK_TEST_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
    PEGEL_TEST_BIN_DIR="${CMAKE_CURRENT_SOURCE_DIR}/bin"
    PEGEL_TEST_SCENARIO="${CMAKE_CURRENT_SOURCE_DIR}/scenario.json"
    PEGEL_TEST_ARTIFACT_DIR="${CMAKE_CURRENT_BINARY_DIR}/artifacts"
    PEGEL_TEST_QM_DIR="${CMAKE_BINARY_DIR}"
)
target_link_libraries(pegel_uitest PRIVATE pegelcore pegelcoreplugin Qt6::QuickTest)

add_test(NAME ui
    COMMAND ${PEGEL_DBUS_RUN_SESSION} --config-file=${CMAKE_CURRENT_SOURCE_DIR}/dbus-session.conf -- $<TARGET_FILE:pegel_uitest>)
set_tests_properties(ui PROPERTIES TIMEOUT 300)

add_test(NAME model
    COMMAND ${PEGEL_NODE} --test ${CMAKE_SOURCE_DIR}/tests/model.test.mjs)
