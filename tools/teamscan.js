const { runOne } = require("./sim.js");

const C = globalThis.GameContent;
const RNG = globalThis.RNG;
const N = Number(process.argv[2] || 500);

function displayedTeams(seed, direction) {
  const teams = C.candidateTeams.filter((t) => t.direction === direction);
  const rng = RNG.mulberry32(RNG.hashSeed(seed + ":pool:" + direction));
  const arr = teams.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

function score(team) {
  return (
    team.hidden.skill +
    team.hidden.quality * 0.4 +
    team.hidden.speed * 0.25 +
    team.hidden.stability * 0.15 +
    team.headcount * 0.3 -
    team.salary * 0.4
  );
}

function choose(teams) {
  return teams.slice().sort((a, b) => score(b) - score(a))[0];
}

const results = [];
const randomResults = [];
for (let seed = 1; seed <= N; seed++) {
  const seedStr = String(seed);
  const chosen = C.directions.map((d) => choose(displayedTeams(seedStr, d.id)));
  const r = runOne(seedStr, true, chosen.map((t) => t.id));
  results.push(r);
  randomResults.push(runOne(seedStr, false, chosen.map((t) => t.id)));
}

function summarize(label, rows) {
  const n = rows.length;
  const success = rows.filter((r) => r.success).length;
  const dist = {};
  rows.forEach((r) => {
    dist[r.ending] = (dist[r.ending] || 0) + 1;
  });
  const avg = (key) => (rows.reduce((s, r) => s + (r[key] || 0), 0) / n).toFixed(1);
  console.log(`\n=== ${label} (${n} seeds) ===`);
  console.log(`success: ${((success / n) * 100).toFixed(1)}%`);
  console.log("endings:", dist);
  console.log(
    `avg score ${avg("score")} | budget ${avg("budget")} | delay ${avg("delay")} | coverage ${avg("coverage")} | bugs ${avg("bugs")} | risk ${avg("risk")}`
  );
  const overspent = rows.filter((r) => (r.overspendPct || 0) > 0).length;
  const crashed = rows.filter((r) => r.cashCrash).length;
  console.log(
    `budget: overspent ${((overspent / n) * 100).toFixed(1)}% | cash crash ${((crashed / n) * 100).toFixed(1)}% | avg overspend ${avg("overspendPct")}%`
  );
}

summarize("random pools + informed team choice + informed play", results);
summarize("same pools + random play", randomResults);

console.log("\nsample pool seed 1:");
C.directions.forEach((d) => {
  console.log(
    d.name +
      ": " +
      displayedTeams("1", d.id)
        .map((t) => t.name + "（" + t.salary + " 万 / " + t.headcount + " 人）")
        .join("、")
  );
});
