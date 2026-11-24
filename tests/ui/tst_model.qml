// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Pegel contributors

import QtQuick
import QtTest
import "../model.cases.mjs" as ModelCases

// Runs the cases of tests/model.cases.mjs inside Qt's JavaScript engine, the one Pegel ships with. Node runs the same
// cases in tests/model.test.mjs, but it accepts newer JavaScript than Qt does.
TestCase {
    name: "ModelInQt"

    readonly property var assert: ({
            equal: (actual, expected, message) => compare(actual, expected, message),
            deepEqual: (actual, expected, message) => compare(actual, expected, message),
            match: (text, pattern) => verify(pattern.test(text), `"${text}" does not match ${pattern}`),
            throws: (run, pattern) => {
                let thrown = null;
                try {
                    run();
                } catch (error) {
                    thrown = error;
                }
                verify(thrown !== null, "nothing was thrown");
                if (pattern !== undefined) {
                    const text = String(thrown.message ?? thrown);
                    verify(pattern.test(text), `"${text}" does not match ${pattern}`);
                }
            }
        })

    function test_case_data() {
        return Object.keys(ModelCases.cases).map(name => ({
                    tag: name
                }));
    }

    function test_case(data) {
        ModelCases.cases[data.tag](assert);
    }
}
