let wptData;
const resultsBody = document.querySelector(".results tbody");


let runIds;
fetch("https://wpt.fyi/api/runs?label=master")
  .then(r => r.json())
  .then(runs => {
    runIds = runs.map(r => r.id);
    return fetch("https://wpt.fyi/api/search?run_ids=" + runIds.join(",") + "&q=" + (window.spec ?? "webrtc") + "/");
  })
  .then(r => r.json())
  .then(data => {
    wptData = data;
    return fetch("annotations" + (window.spec ? "-" + window.spec : "") + ".json");
  })
  .then(r => r.json())
  .then(annotations => {
    wptData.results
      .forEach(r => {
        const testName = r.test.slice(1);
        const annotation = annotations[testName] || {};
        const tr = document.createElement("tr");
        const testTd = document.createElement("th");
        const link = document.createElement("a");
        link.href = "https://wpt.fyi/results" + r.test + "?run_ids=" + runIds.join(",");
        link.textContent = testName;
        testTd.appendChild(link)
        tr.appendChild(testTd);
        let fullImpl = 0;
        r.legacy_status.forEach((s,i) => {
          const td = document.createElement("td");
          td.textContent = s.passes + "/" + s.total;
          // TODO: is this the right check
          if (s.passes === s.total && s.total) {
            td.classList.add("good");
            // We skip Chrome/Edge equivalence by default
            if (!(fullImpl && i === 1)) {
              fullImpl++;
            }
          }
          tr.appendChild(td);
        });
        let status;
        if (fullImpl >= 2) {
          tr.classList.add("good");
          status = "good";
        } else if (annotation.status) {
          tr.classList.add(annotation.status);
          status = annotation.status;
        }
        const commentTd = document.createElement("td");
        commentTd.className = "comment";
        if (annotation.comment) {
          commentTd.innerHTML = annotation.comment;
        } else if (!status) {
          commentTd.className = "todo";
        }
        tr.appendChild(commentTd);
        resultsBody.appendChild(tr);
      });
  });
