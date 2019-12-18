# webrtc-interop-reports
Interoperability testing reports for WebRTC WG specifications

`annotations.json` contains annotations on the test results available in https://wpt.fyi/ - each test path is  a key in the JSON object, and the value for that key is an object with:
* a `comment` key to give an interpretation to the numerical results
* optionally a `status` key to assess that a test result should be interpreted as `good` (i.e. showing interop despite what the numbers migt how at first), `ok` (i.e. showing likely enough interop despite some test failures), `bad` (if the test results show no meaningful interop on the said feature), 'ignore' if the the results aren't relevant

`webrtc-pc-report.html` loads the results from wpt.fyi, the annotations and contains additional human-managed content interpreting the overall situation.