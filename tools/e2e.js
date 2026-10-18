const { spawn, execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const EDGE = process.env.E2E_EDGE || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const ROOT = path.resolve(__dirname, "..");
const PROFILE = path.join(os.tmpdir(), "opencode", "edge-e2e-profile");
const URL =
  process.env.E2E_URL || "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === "page" && t.url.indexOf("index.html") >= 0);
      if (page && page.webSocketDebuggerUrl) return page;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error("DevTools target not found");
}

async function main() {
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  fs.mkdirSync(PROFILE, { recursive: true });
  const child = spawn(
    EDGE,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--window-size=390,844",
      URL
    ],
    { windowsHide: true, stdio: "ignore" }
  );

  const errors = [];
  const logs = [];

  try {
    const target = await waitForTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let nextId = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        errors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
      } else if (msg.method === "Log.entryAdded") {
        const entry = msg.params.entry;
        if (entry.level === "error") errors.push(entry.text);
        else logs.push(entry.text);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result ? res.result.value : undefined;
    }

    async function shot(name) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(ROOT, name), Buffer.from(res.data, "base64"));
    }

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Log.enable");

    for (let i = 0; i < 40; i++) {
      const ready = await evaluate("document.readyState");
      if (ready === "complete") break;
      await sleep(150);
    }

    await sleep(200);
    await shot("shot-title.png");
    await evaluate(`document.getElementById('seedInput').value='TEST1'; document.querySelector('[data-act="start"]').click(); true`);
    await sleep(200);
    for (let i = 0; i < 6; i++) {
      await evaluate(`(function(){ var lists = document.querySelectorAll('.candidate-list'); var list = lists[${i}]; if (!list) return false; var btn = list.querySelector('[data-act="toggle-team"]'); if (btn) btn.click(); return true; })()`);
      await sleep(100);
    }
    const selectedIds = await evaluate(`Object.keys(window.GameUI.state.selectedTeams).map(function(d){ return window.GameUI.state.selectedTeams[d]; })`);
    for (const id of selectedIds) {
      await evaluate(`(function(){ var b = document.querySelector('[data-act="background-team"][data-id="${id}"]'); if (b) b.click(); return true; })()`);
      await sleep(80);
    }
    const firstId = selectedIds[0];
    await evaluate(`document.querySelector('[data-act="team-detail"][data-id="${firstId}"]').click(); true`);
    await sleep(400);
    await shot("shot-team-detail.png");
    await evaluate(`document.querySelector('[data-act="close-modal"]').click(); true`);
    await sleep(100);
    await shot("shot-team.png");
    await evaluate(`document.querySelector('[data-act="start-game"]').click(); true`);
    await sleep(250);
    await shot("shot-game-m1.png");

    await evaluate(`document.querySelector('[data-act="open-decision"]').click(); true`);
    await sleep(200);
    await shot("shot-decision.png");
    const management = await evaluate(`(function(){
      var paint = document.querySelector('[data-act="pick-action"][data-id="paint"]');
      paint.click();
      var age = (document.querySelector('.direction-chip .chip-sub') || {}).textContent || "";
      var raise = document.querySelector('[data-act="pick-action"][data-id="raise"]');
      raise.click();
      var cost = (document.querySelector('[data-act="pick-action"][data-id="raise"] .decision-option-cost') || {}).textContent || "";
      return { paint: !!paint, age: age, raise: !!raise, cost: cost };
    })()`);
    console.log("--- MANAGEMENT ACTIONS ---");
    console.log(JSON.stringify(management));
    await evaluate(`document.querySelector('[data-act="pick-action"][data-id="audit"]').scrollIntoView({block:'center'}); true`);
    await sleep(100);
    await evaluate(`document.querySelector('[data-act="pick-action"][data-id="audit"]').click(); true`);
    await sleep(120);
    await shot("shot-decision-target.png");
    await evaluate(`document.querySelector('[data-act="pick-direction"][data-direction="arch"]').click(); true`);
    await sleep(120);
    await evaluate(`document.querySelector('[data-act="inline-action"][data-id="audit"]').click(); true`);
    await sleep(200);
    await shot("shot-decision-result.png");
    await evaluate(`document.querySelector('[data-act="back-to-game"]').click(); true`);
    await sleep(150);

    for (let month = 1; month <= 6; month++) {
      if (month === 2 || month === 4) {
        await evaluate(`document.getElementById('toast').classList.remove('show'); true`);
      }
      if (month === 2) await shot("shot-game-m2.png");
      if (month === 4) await shot("shot-game-m4.png");
      if (month > 1) {
        await evaluate(`document.querySelector('[data-act="open-decision"]').click(); true`);
        await sleep(120);
        await evaluate(`document.querySelector('[data-act="pick-action"][data-id="skip"]').click(); true`);
        await sleep(100);
        await evaluate(`document.querySelector('[data-act="inline-action"][data-id="skip"]').click(); true`);
        await sleep(120);
        await evaluate(`document.querySelector('[data-act="back-to-game"]').click(); true`);
        await sleep(120);
      }

      await evaluate(`document.querySelector('[data-act="start-month"]').click(); true`);
      await sleep(250);

      if (month === 1 || month === 4) await shot("shot-report-m" + month + ".png");
      if (month === 3) {
        await evaluate(`document.getElementById('toast').classList.remove('show'); true`);
        await sleep(250);
        await evaluate(`(function(){ var e = document.querySelector('.event-card'); if (e) e.scrollIntoView({ block: 'center' }); return true; })()`);
        await sleep(150);
        await shot("shot-background-event.png");
      }

      for (let guard = 0; guard < 10; guard++) {
        const has = await evaluate(`!!document.querySelector('[data-act="event-option"]')`);
        if (!has) break;
        await evaluate(`document.querySelector('[data-act="event-option"]').click(); true`);
        await sleep(120);
      }

      await evaluate(`document.querySelector('[data-act="advance"]').click(); true`);
      await sleep(250);
    }

    await evaluate(`document.getElementById('toast').classList.remove('show'); true`);
    await sleep(250);
    await shot("shot-waiver.png");

    const waiverIds = await evaluate(`window.GameUI.state.game.waivers.map(function(w){return {id:w.id, risk:w.trueRisk, cost:w.fixCost};})`);
    for (const w of waiverIds) {
      const canFix = await evaluate(
        `(function(){ var b = document.querySelector('[data-act="waiver-fix"][data-id="${w.id}"]'); return !!b && !b.disabled; })()`
      );
      const budget = await evaluate(`window.GameUI.state.game.budget`);
      if (w.risk >= 0.55 && canFix && budget >= w.cost) {
        await evaluate(`document.querySelector('[data-act="waiver-fix"][data-id="${w.id}"]').click(); true`);
      } else {
        await evaluate(`document.querySelector('[data-act="waiver-waive"][data-id="${w.id}"]').click(); true`);
      }
      await sleep(80);
    }
    await evaluate(`document.getElementById('toast').classList.remove('show'); true`);
    await sleep(250);
    await shot("shot-waiver-decided.png");

    await evaluate(`window.GameUI.state.game.budget = -600; window.GameUI.render(); true`);
    await sleep(150);
    const budgetNotice = await evaluate(`(document.querySelector('.budget-crisis') || {}).innerText || ''`);
    console.log("--- BUDGET CRISIS UI ---");
    console.log(budgetNotice);
    await evaluate(`window.GameUI.state.game.rng = (function(){ var vals = [0.01, 0.99, 0.99, 0.01, 0.01]; var i = 0; return function(){ return vals[Math.min(i++, vals.length - 1)]; }; })(); true`);
    await evaluate(`document.querySelector('[data-act="submit-waivers"]').click(); true`);
    await sleep(300);
    const needsConfirm = await evaluate(`!!document.querySelector('[data-act="submit-waivers"]')`);
    if (needsConfirm) {
      await evaluate(`document.querySelector('[data-act="submit-waivers"]').click(); true`);
      await sleep(400);
    }
    await evaluate(`document.getElementById('toast').classList.remove('show'); true`);
    await sleep(250);
    await shot("shot-result.png");

    await evaluate(`document.querySelector('[data-act="share-image"]').click(); true`);
    await sleep(300);
    const shareFallback = await evaluate(`(document.querySelector('.sheet .warning') || {}).innerText || ''`);
    console.log("--- SHARE FALLBACK ---");
    console.log(shareFallback);
    await evaluate(`document.querySelector('[data-act="close-modal"]').click(); true`);
    await sleep(100);

    await evaluate(`window.__xhsCalls = []; window.xhs = { miniTool: { writeTempFile: function(o){ window.__xhsCalls.push({ type: "writeTempFile", bytes: o.data.length }); return Promise.resolve({ filePath: "/tmp/share.png" }); }, saveImageToPhotosAlbum: function(o){ window.__xhsCalls.push({ type: "saveImage", filePath: o.filePath }); return Promise.resolve({ errMsg: "saveImageToPhotosAlbum:ok" }); }, postNote: function(o){ window.__xhsCalls.push({ type: "postNote", title: o.title, contentLength: o.content.length, media: o.mediaInfo.image_resources[0].url }); return Promise.resolve({ errMsg: "postNote:ok" }); } } }; true`);
    await evaluate(`document.querySelector('[data-act="share-image"]').click(); true`);
    await sleep(400);
    await shot("shot-share.png");
    await evaluate(`document.querySelector('[data-act="save-share-image"]').click(); true`);
    await sleep(200);
    await evaluate(`document.querySelector('[data-act="post-share-note"]').click(); true`);
    await sleep(200);
    const xhsCalls = await evaluate(`window.__xhsCalls`);
    console.log("--- XHS CALLS ---");
    console.log(JSON.stringify(xhsCalls));
    await evaluate(`document.querySelector('[data-act="close-modal"]').click(); true`);
    await sleep(100);

    const result = await evaluate(`document.body.innerText.slice(0, 2500)`);
    console.log("--- RESULT TEXT ---");
    console.log(result);
    console.log("--- ERRORS ---");
    console.log(errors.length ? errors.join("\n") : "none");
    console.log("--- LOGS ---");
    console.log(logs.length ? logs.slice(0, 20).join("\n") : "none");

    ws.close();
    if (errors.length) process.exitCode = 1;
  } finally {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } catch (e) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
