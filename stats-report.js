// RTCStats is implicit in all of them
// this is from WebRTC Stats spec - maybe extract from there instead?
const statsComposition = {
  "codec": ["RTCCodecStats"],
  "inbound-rtp": ["RTCRtpStreamStats", "RTCReceivedRtpStreamStats", "RTCInboundRtpStreamStats"],
  "outbound-rtp": ["RTCRtpStreamStats", "RTCSentRtpStreamStats", "RTCOutboundRtpStreamStats"],
  "remote-inbound-rtp": ["RTCRtpStreamStats", "RTCReceivedRtpStreamStats", "RTCRemoteInboundRtpStreamStats"],
  "remote-outbound-rtp": ["RTCRtpStreamStats", "RTCSentRtpStreamStats", "RTCRemoteOutboundRtpStreamStats"],
  "media-source": ["RTCMediaSourceStats", "RTCAudioSourceStats", "RTCVideoSourceStats"], // TODO: Audio/Video need to be considered separately?
  "peer-connection": ["RTCPeerConnectionStats"],
  "data-channel": ["RTCDataChannelStats"],
  "transport": ["RTCTransportStats"],
  "candidate-pair": ["RTCIceCandidatePairStats"],
  "local-candidate": ["RTCIceCandidateStats"],
  "remote-candidate": ["RTCIceCandidateStats"],
  "certificate": ["RTCCertificateStats"]
};

let wptResults = {};

(async function() {
  const runIds = (await fetch("https://wpt.fyi/api/runs?label=master").then(r => r.json())).map(r => r.id);
  const {idlparsed}= await fetch("https://w3c.github.io/webref/ed/idlparsed/webrtc-stats.json").then(r => r.json());
  const wptdata = (await fetch("https://wpt.fyi/api/search?run_ids=" + runIds.join(",") + "&q=webrtc-stats/supported-stats.html").then(r => r.json())).runs;
  const annotations = await fetch("annotations-stats.json").then(r => r.json());

  const [chromiumResults, , firefoxResults, safariResults] = await Promise.all(wptdata.map(async w => await fetch(w.raw_results_url.replace('/wptd-results/', '/wptd/')
														  .replace("/report.json", "/webrtc-stats/supported-stats.html")).then(r => r.json())));

  const missingTests = [];
for (let type of Object.keys(statsComposition)) {
  wptResults[type] = {};
  // we don't check RTCStats fields as that's unlikely to be of interest
  const statDictionaries = statsComposition[type];
  for (let dict of statDictionaries) {
    if (!idlparsed.idlNames[dict]) {
      console.error(`unknown dictionary ${dict} for ${type}`);
      continue;
    }
    for (let field of idlparsed.idlNames[dict].members.map(m => m.name)) {
      for (let browserResults of [chromiumResults, firefoxResults, safariResults]) {
	const impl = browserResults.subtests.find(t => t.name === `${type}'s ${field}`);
	if (!impl) {
	  if (!missingTests.find(t => t.type === type && t.field === field)) 
	    missingTests.push({type, field});
          console.error("missing results for " + type + "." + field);
          continue;
	}
	if (!wptResults[type][field]) wptResults[type][field] = {count: annotations[type + "." + field]?.manualSupport?.length ?? 0, comment: annotations[type + "." + field]?.comment};
	if (impl.status === "PASS") {
          wptResults[type][field].count += 1;
	}
      }
    }
  }
}
  document.getElementById("noimpl").innerHTML = `
<h2>Stat types without implementations</h2>
${Object.keys(wptResults).length ? `<ul>${Object.keys(wptResults).filter(type => Object.keys(wptResults[type]).length === 0).map(type => `<li><code>${type}</code></li>`).join('')}</ul>` : `<p>N/A</p>`}
<h2>Stat fields without implementations</h2>
<ul>${Object.keys(wptResults).filter(type => Object.values(wptResults[type]).find(f => f.count === 0)).map(type => `<li><code>${type}</code>: <ul>${Object.keys(wptResults[type]).filter(field => wptResults[type][field].count ===0).map(field => `<li><code>${field}</code>${wptResults[type][field].comment ? ': ' + wptResults[type][field].comment : ''}</li>`).join('')}</ul></li>`).join('')}</ul>
`;
  document.getElementById("singleimpl").innerHTML = `<h2>Stat fields with only one implementation</h2>
<ul>${Object.keys(wptResults).filter(type => Object.values(wptResults[type]).find(f => f.count === 1)).map(type => `<li><code>${type}</code>: <ul>${Object.keys(wptResults[type]).filter(field => wptResults[type][field].count === 1).map(field => `<li><code>${field}</code>${wptResults[type][field].comment ? ': ' + wptResults[type][field].comment : ''}</li>`).join('')}</ul></li>`).join('')}</ul>
`;
  if (missingTests.length) {
    document.getElementById("missingtests").innerHTML = `<h2>Stat fields without matching WPT test</h2>
<ul>${missingTests.map(({type, field}) => `<li>${type}.${field}</li>`).join('')}</ul>`;
  }
})();
