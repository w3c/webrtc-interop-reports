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

let results = {};
let infoGap = new Set();
Promise.all([fetch("webrtc-stats.json"), fetch("https://w3c.github.io/webref/ed/idlparsed/webrtc-stats.json")].map(p => p.then(r => r.json())))
  .then(([{browserStatsList},{idlparsed}]) => {
    // we only consider the latest version of the browser in the data set
    browserStatsList = browserStatsList.filter((b, i, arr) => !arr.find(b2 => b2.browserInfo.name === b.browserInfo.name && b2.browserInfo.version > b.browserInfo.version));
    console.log(browserStatsList);
    for (let type of Object.keys(statsComposition)) {
      results[type] = {};
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
              results[type][field] = results[type][field] ? results[type][field] : 0;
            }
            if (impl.isImplemented) {
              typeIsImplemented = true;
              results[type][field] = results[type][field] ? results[type][field] + 1 : 1;
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
<ul>${Object.keys(results).filter(type => Object.keys(results[type]).length === 0).map(type => `<li><code>${type}</code></li>`).join('')}</ul>
<h2>Stat fields without implementations</h2>
<ul>${Object.keys(results).filter(type => Object.values(results[type]).includes(0)).map(type => `<li><code>${type}</code>: <ul>${Object.keys(results[type]).filter(field => results[type][field] ===0).map(field => `<li><code>${field}</code></li>`).join('')}</ul></li>`).join('')}</ul>
`;
    console.log(results);
  });
