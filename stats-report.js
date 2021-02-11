// RTCStats is implicit in all of them
// this is from WebRTC Stats spec - maybe extract from there instead?
const statsComposition = {
  "codec": ["RTCCodecStats"],
  "inbound-rtp": ["RTCRtpStreamStats", "RTCReceivedRtpStreamStats", "RTCInboundRtpStreamStats"],
  "outbound-rtp": ["RTCRtpStreamStats", "RTCSentRtpStreamStats", "RTCOutboundRtpStreamStats"],
  "remote-inbound-rtp": ["RTCRtpStreamStats", "RTCReceivedRtpStreamStats", "RTCRemoteInboundRtpStreamStats"],
  "remote-outbound-rtp": ["RTCRtpStreamStats", "RTCSentRtpStreamStats", "RTCRemoteOutboundRtpStreamStats"],
  "media-source": ["RTCMediaSourceStats", "RTCAudioSourceStats", "RTCVideoSourceStats"], // TODO: Audio/Video need to be considered separately?
  "csrc": ["RTCRtpContributingSourceStats"],
  "peer-connection": ["RTCPeerConnectionStats"],
  "data-channel": ["RTCDataChannelStats"],
  "transceiver": ["RTCRtpTransceiverStats"],
  "sender": ["RTCMediaHandlerStats", "RTCAudioSenderStats", "RTCVideoSenderStats"],
  "receiver": ["RTCMediaHandlerStats"],
  "transport": ["RTCTransportStats"],
  "sctp-transport": ["RTCSctpTransportStats"],
  "candidate-pair": ["RTCIceCandidatePairStats"],
  "local-candidate": ["RTCIceCandidateStats"],
  "remote-candidate": ["RTCIceCandidateStats"],
  "certificate": ["RTCCertificateStats"],
  "ice-server": ["RTCIceServerStats"]
};


let csioResults = {}, wptResults = {};
let infoGap = new Set();
const urls = ["webrtc-stats.json", "https://w3c.github.io/webref/ed/idlparsed/webrtc-stats.json", "https://storage.googleapis.com/wptd/c951dfff50b1f06021cb0f5f2016056bebb5801c/chrome-90.0.4412.3_dev-linux-20.04-cb639e25cf/webrtc-stats/supported-stats.html", "https://storage.googleapis.com/wptd/c951dfff50b1f06021cb0f5f2016056bebb5801c/firefox-87.0a1-linux-20.04-8b955c1a53/webrtc-stats/supported-stats.html", "https://storage.googleapis.com/wptd/c951dfff50b1f06021cb0f5f2016056bebb5801c/safari-119_preview-mac-10.15-92c9f97c0c/webrtc-stats/supported-stats.html"];

Promise.all(urls.map(u => fetch(u).then(r => r.json())))
  .then(([{browserStatsList}, {idlparsed}, chromiumResults, firefoxResults, safariResults]) => {
    // we only consider the latest version of the browser in the data set
    browserStatsList = browserStatsList.filter((b, i, arr) => !arr.find(b2 => b2.browserInfo.name === b.browserInfo.name && b2.browserInfo.version > b.browserInfo.version));
    console.log(browserStatsList);
    for (let type of Object.keys(statsComposition)) {
      csioResults[type] = {};
      wptResults[type] = {};
      // we don't check RTCStats fields as that's unlikely to be of interest
      const statDictionaries = statsComposition[type];
      for (let dict of statDictionaries) {
        let typeIsImplemented = false;
        if (!idlparsed.idlNames[dict]) {
          console.error(`unknown dictionary ${dict} for ${type}`);
          continue;
        }
        for (let field of idlparsed.idlNames[dict].members.map(m => m.name)) {
          for (let browser of browserStatsList) {
            let name = browser.browserInfo.name;
            if (!browser.implementationDetail[type]) {
              infoGap.add(type);
              continue;
            }
            const impl = browser.implementationDetail[type].rtcStats.find(s => s.statsKey === field);
            if (!impl) {
              infoGap.add(type + "." + field);
              continue;
            }
            if (typeIsImplemented) {
              csioResults[type][field] = csioResults[type][field] ? csioResults[type][field] : 0;
            }
            if (impl.isImplemented) {
              typeIsImplemented = true;
              csioResults[type][field] = csioResults[type][field] ? csioResults[type][field] + 1 : 1;
            }
          }
          for (let browserResults of [chromiumResults, firefoxResults, safariResults]) {
            const impl = browserResults.subtests.find(t => t.name === `${type}'s ${field}`);
            if (!impl) {
              console.error("missing results for " + type + "." + field);
              continue;
            }
            if (typeIsImplemented) {
              wptResults[type][field] = wptResults[type][field] ? wptResults[type][field] : 0;
            }
            if (impl.status === "PASS") {
              typeIsImplemented = true;
              wptResults[type][field] = wptResults[type][field] ? wptResults[type][field] + 1 : 1;
            }

          }
        }
      }
    }
    document.getElementById("missinginfo").innerHTML = `
<h2>Stats not identified in callstats.io report</h2>
<ul>${[...infoGap].map(g => `<li><code>${g}</code></li>`).join('')}</ul>
`;
    document.getElementById("noimpl").innerHTML = `
<h2>Stat types without implementations</h2>
<h3>in WPT report</h3>
<ul>${Object.keys(wptResults).filter(type => Object.keys(wptResults[type]).length === 0).map(type => `<li><code>${type}</code></li>`).join('')}</ul>
<h3>in Callstats.io report</h3>
<ul>${Object.keys(csioResults).filter(type => Object.keys(csioResults[type]).length === 0).map(type => `<li><code>${type}</code></li>`).join('')}</ul>
<h2>Stat fields without implementations</h2>
<h3>in WPT report</h3>
<ul>${Object.keys(wptResults).filter(type => Object.values(wptResults[type]).includes(0)).map(type => `<li><code>${type}</code>: <ul>${Object.keys(wptResults[type]).filter(field => wptResults[type][field] ===0).map(field => `<li><code>${field}</code></li>`).join('')}</ul></li>`).join('')}</ul>
<h3>in Callstats.io report</h3>
<ul>${Object.keys(csioResults).filter(type => Object.values(csioResults[type]).includes(0)).map(type => `<li><code>${type}</code>: <ul>${Object.keys(csioResults[type]).filter(field => csioResults[type][field] ===0).map(field => `<li><code>${field}</code></li>`).join('')}</ul></li>`).join('')}</ul>
`;

  });
