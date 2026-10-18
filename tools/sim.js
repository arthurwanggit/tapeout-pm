require("../js/rng.js");
require("../js/content/teams.js");
require("../js/content/projects.js");
require("../js/content/events.js");
require("../js/content/waivers.js");
require("../js/content/endings.js");
require("../js/engine.js");

const E = globalThis.GameEngine;
const C = globalThis.GameContent;

function randomTeamIds(rng) {
  return C.directions.map((d) => {
    const teams = C.candidateTeams.filter((t) => t.direction === d.id);
    return teams[Math.floor(rng() * teams.length)].id;
  });
}

function bestTeamIds() {
  return ["arch_xu", "algo_kai", "rtl_jie", "dv_lin", "midend_may", "backend_chen"];
}

function chooseAction(state, rng, informed) {
  if (state.actionUsed) return;
  const active = E.getActiveDirections(state);
  if (!active.length) return;

  if (informed) {
    if (state.stats.actionsUsed >= 2) return;
    const dv = state.teams.dv;
    if (state.month >= 4 && state.coverage < 70 && state.budget >= 900) {
      const r = E.chooseAction(state, "verify");
      if (r.ok) return;
    }
    if (state.month <= 3 && state.budget >= 1400) {
      const weakest = active
        .slice()
        .sort((a, b) => state.teams[a.id].progress - state.teams[b.id].progress)[0];
      const r = E.chooseAction(state, "overtime", weakest.id);
      if (r.ok) return;
    }
    if (state.morale < 40 && state.budget >= 900) {
      const r = E.chooseAction(state, "teambuild");
      if (r.ok) return;
    }
  } else {
    if (rng() < 0.5) {
      const pick = E.ACTIONS[Math.floor(rng() * E.ACTIONS.length)];
      if (pick.cost <= state.budget) {
        const target = pick.needsTarget ? active[Math.floor(rng() * active.length)].id : null;
        E.chooseAction(state, pick.id, target);
      }
    }
  }
}

function scoreOption(opt) {
  const e = opt.effects || {};
  let s = 0;
  if (e.progress) Object.values(e.progress).forEach((v) => (s += v));
  if (e.quality) Object.values(e.quality).forEach((v) => (s += v * 0.5));
  if (e.coverage) s += e.coverage;
  if (e.bugs) s -= e.bugs;
  if (e.budget) s += e.budget * 0.01;
  if (e.morale) s += e.morale * 0.2;
  if (e.market) s += e.market * 0.3;
  if (e.delay) s -= e.delay * 5;
  return s;
}

function resolveEvents(state, rng, informed) {
  state.pendingEvents.forEach((ev) => {
    if (ev.resolved) return;
    let idx = Math.floor(rng() * ev.options.length);
    if (informed) {
      let best = -Infinity;
      ev.options.forEach((o, i) => {
        const s = scoreOption(o);
        if (s > best) {
          best = s;
          idx = i;
        }
      });
    }
    E.resolveEvent(state, ev.id, idx);
  });
}

function resolveWaivers(state, rng, informed) {
  if (state.phase !== "waiver") return;
  const items = state.waivers.slice().sort((a, b) => b.trueRisk - a.trueRisk);
  items.forEach((w) => {
    if (informed) {
      if (
        w.trueRisk >= 0.55 &&
        state.budget >= w.fixCost &&
        state.delayWeeks + w.fixWeeks <= 5
      ) {
        E.setWaiver(state, w.id, "fix");
      } else {
        E.setWaiver(state, w.id, "waive");
      }
    } else {
      if (rng() < 0.35 && state.budget >= w.fixCost) E.setWaiver(state, w.id, "fix");
      else E.setWaiver(state, w.id, "waive");
    }
  });
  return E.submitWaivers(state);
}

function runOne(seed, informed, teamIds) {
  const rng = globalThis.RNG.mulberry32(globalThis.RNG.hashSeed(String(seed)));
  const ids = Array.isArray(teamIds) ? teamIds : informed ? bestTeamIds() : randomTeamIds(rng);
  const state = E.createRun({ seed: String(seed), projectId: "xuanwu1", teamIds: ids });

  while (state.month <= 6 && state.phase !== "result") {
    if (state.phase === "planning") {
      chooseAction(state, rng, informed);
      E.resolveMonth(state);
    } else if (state.phase === "report") {
      resolveEvents(state, rng, informed);
      E.advanceMonth(state);
    } else if (state.phase === "waiver") {
      resolveWaivers(state, rng, informed);
    } else {
      break;
    }
  }

  const ev = state.evaluation || {};
  const success = !!(ev.works && (ev.severe === "none" || ev.severe === "minor") && ev.mp);
  return {
    seed,
    teamIds: ids,
    success,
    ending: ev.ending ? ev.ending.title : "?",
    grade: ev.grade,
    works: ev.works,
    severe: ev.severe,
    mp: ev.mp,
    market: ev.market,
    score: ev.score,
    budget: Math.round(ev.budgetRemaining),
    delay: ev.delayWeeks,
    coverage: ev.coverage,
    bugs: ev.bugs,
    risk: ev.risk,
    traitRisk: ev.traitRisk,
    overspend: ev.overspend,
    overspendPct: ev.overspendPct,
    overspendTier: ev.overspendTier,
    budgetRatingPenalty: ev.budgetRatingPenalty,
    pCashCrash: ev.pCashCrash,
    cashCrash: ev.cashCrash,
    pWorks: ev.pWorks,
    pSevere: ev.pSevere,
    pMP: ev.pMP,
    quality: ev.quality,
    headcount: state.teams ? C.directions.reduce((s, d) => s + state.teams[d.id].content.headcount, 0) : 0,
    payroll: state.teams ? C.directions.reduce((s, d) => s + state.teams[d.id].content.salary, 0) : 0
  };
}

function summarize(label, rows) {
  const n = rows.length;
  const success = rows.filter((r) => r.success).length;
  const dist = {};
  rows.forEach((r) => {
    dist[r.ending] = (dist[r.ending] || 0) + 1;
  });
  const avg = (key) => (rows.reduce((s, r) => s + (r[key] || 0), 0) / n).toFixed(1);
  console.log(`\n=== ${label} (${n} runs) ===`);
  console.log(`success: ${((success / n) * 100).toFixed(1)}%`);
  console.log("endings:", dist);
  console.log(
    `avg score ${avg("score")} | budget ${avg("budget")} | delay ${avg("delay")} | coverage ${avg("coverage")} | bugs ${avg("bugs")} | risk ${avg("risk")} | traitRisk ${avg("traitRisk")}`
  );
  const overspent = rows.filter((r) => (r.overspendPct || 0) > 0).length;
  const rated = rows.filter((r) => r.budgetRatingPenalty).length;
  const crashed = rows.filter((r) => r.cashCrash).length;
  console.log(
    `budget: overspent ${((overspent / n) * 100).toFixed(1)}% | rating -1 ${((rated / n) * 100).toFixed(1)}% | cash crash ${((crashed / n) * 100).toFixed(1)}% | avg overspend ${avg("overspendPct")}%`
  );
  const grades = {};
  rows.forEach((r) => (grades[r.grade] = (grades[r.grade] || 0) + 1));
  console.log("grades:", grades);
}

function main() {
  const N = Number(process.argv[2] || 500);
  const randomRows = [];
  const informedRows = [];
  for (let i = 1; i <= N; i++) {
    randomRows.push(runOne(i, false, null));
    informedRows.push(runOne(i, true, null));
  }
  summarize("random team + random play", randomRows);
  summarize("strong team + informed play", informedRows);
}

if (require.main === module) {
  main();
}

module.exports = {
  runOne,
  bestTeamIds,
  randomTeamIds
};
