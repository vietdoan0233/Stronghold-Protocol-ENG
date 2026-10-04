#!/bin/bash
# A Chromium that fails every non-local lookup at once. Point CHROME_PATH at this script to run the browser suites / tours in a
# sandbox with no route to the web-font hosts: without it every navigation waits 30 s for fonts.googleapis.com and times out.
#   CHROME_PATH=$PWD/tools/locale-work/offline-chrome.sh SP_E2E=1 node --test test/ui/<x>.e2e.test.js
# (the real Chromium: CHROME_REAL, default /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
exec "${CHROME_REAL:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}" --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost" "$@"
