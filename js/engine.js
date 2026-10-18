(function (global) {
  var GC = (global.GameContent = global.GameContent || {});
  var RNG = global.RNG;

  var ACTIONS = [
    {
      id: "overtime",
      name: "加班冲刺",
      cost: 60,
      morale: -8,
      needsTarget: true,
      desc: "指定方向本月进度 +15，质量 -3。"
    },
    {
      id: "verify",
      name: "加验证",
      cost: 90,
      morale: -3,
      needsTarget: false,
      desc: "验证进度 +10，bug -8。"
    },
    {
      id: "ip",
      name: "买 IP / 外包",
      cost: 150,
      morale: 0,
      needsTarget: true,
      desc: "指定方向进度 +20，质量 -2。"
    },
    {
      id: "cut",
      name: "砍需求",
      cost: 0,
      morale: -5,
      needsTarget: false,
      once: true,
      desc: "所有活跃方向 +5，市场 -8（限一次）。"
    },
    {
      id: "paint",
      name: "画饼",
      cost: 0,
      morale: 0,
      needsTarget: true,
      desc: "选一个团队画饼：平均 3 年以内士气 +10，4–5 年 +3，6 年以上 -3。"
    },
    {
      id: "raise",
      name: "加薪",
      cost: 0,
      costLabel: "月薪+10%",
      morale: 12,
      needsTarget: false,
      desc: "全员月薪永久 +10%，士气 +12。"
    },
    {
      id: "teambuild",
      name: "团建",
      cost: 45,
      morale: 0,
      needsTarget: false,
      desc: "花 45 万，65% 成功士气 +15；35% 翻车士气 -4。"
    },
    {
      id: "audit",
      name: "第三方审计",
      cost: 30,
      morale: 0,
      needsTarget: true,
      desc: "指定方向本月报告真实化。"
    },
    {
      id: "skip",
      name: "什么都不做",
      cost: 0,
      morale: 0,
      needsTarget: false,
      desc: "本月不做额外动作，直接推进。"
    }
  ];

  var TEAMBUILD_WINS = [
    "团建很成功，大家暂时忘了流片，士气 +15。",
    "烤肉和奶茶都到位，团队表示还能再撑一个月，士气 +15。",
    "这次团建居然没人提加班，士气 +15。",
    "破冰游戏没冷场，团队群里第一次没人发“收到”，士气 +15。"
  ];

  var TEAMBUILD_FAILS = [
    "团建选了密室逃脱，结果大家在消防通道里迷路半小时，士气 -4。",
    "团建去漂流，项目经理的手机和团队士气一起掉进水里，士气 -4。",
    "团建玩剧本杀，两个模块负责人为“谁是凶手”吵到凌晨，士气 -4。",
    "团建订了网红餐厅，排队两小时上菜十分钟，回来更累了，士气 -4。",
    "团建爬山，HR 说“不是旅游是拉练”，士气 -4。",
    "团建唱 K，麦霸是隔壁组老板，团队全程在角落吃果盘，士气 -4。"
  ];

  var QUOTES = {
    arch: {
      opt: ["架构评审一次过，放心。", "模块划分很干净，后面不会返工。"],
      neu: ["架构基本定了，还有两个接口在收尾。"],
      cau: ["还有两个模块的接口没对齐，现在开 RTL 就是赌。"]
    },
    algo: {
      opt: ["算法指标很漂亮，定点化再说。", "模型没问题，性能余量很大。"],
      neu: ["算法模型跑通了，定点误差还在看。"],
      cau: ["仿真好看不代表硅上能用，定点误差还没验。"]
    },
    rtl: {
      opt: ["RTL 0.9 已交付，剩下的都是小问题。", "按计划推进，前端这边没风险。"],
      neu: ["RTL 在收敛，还有几个模块没完全清干净。"],
      cau: ["还有三个 corner 没跑，我不建议现在冻结。"]
    },
    dv: {
      opt: ["覆盖率在涨，问题不大。", "回归基本稳定，剩下都是边角料。"],
      neu: ["验证在推进，覆盖率还没到 target。"],
      cau: ["覆盖率不够，还有 corner 没跑，别 freeze。"]
    },
    midend: {
      opt: ["综合初跑很干净，时序没问题。", "DFT 插完了，功耗在预算内。"],
      neu: ["综合跑通了，时序和功耗还在调。"],
      cau: ["setup violation 不少，功耗也超了。"]
    },
    backend: {
      opt: ["后端按计划推进，DRC 快清了。", "时序收敛得不错，别担心。"],
      neu: ["后端在迭代，时序还没完全收敛。"],
      cau: ["布线拥塞，时序还没收敛，别催。"]
    }
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function getTeam(state, direction) {
    return state.teams[direction];
  }

  function getActiveDirections(state, month) {
    var m = month || state.month;
    return GC.directions.filter(function (d) {
      return d.active.indexOf(m) >= 0;
    });
  }

  function isDirectionActive(state, direction, month) {
    var d = GC.directions.find(function (x) {
      return x.id === direction;
    });
    return !!d && d.active.indexOf(month || state.month) >= 0;
  }

  function totalSalary(state) {
    return Object.keys(state.teams).reduce(function (sum, key) {
      return sum + state.teams[key].content.salary;
    }, 0);
  }

  function prepareMonth(state) {
    state.actionUsed = false;
    state.auditDirection = null;
    state.lastAction = null;
    state.pendingEvents = [];
    state.currentReport = null;
    state.phase = "planning";
  }

  function jitterTeamContent(content, seed) {
    var rng = RNG.mulberry32(RNG.hashSeed(seed + ":team:" + content.id));
    var h = content.hidden;
    var hidden = {};
    Object.keys(h).forEach(function (key) {
      hidden[key] = h[key];
    });
    hidden.traits = h.traits.slice();
    hidden.skill = clamp(h.skill + (rng() * 2 - 1) * 6, 30, 95);
    hidden.quality = clamp(h.quality + (rng() * 2 - 1) * 6, 30, 95);
    hidden.speed = clamp(h.speed + (rng() * 2 - 1) * 6, 30, 95);
    hidden.collab = clamp(h.collab + (rng() * 2 - 1) * 5, 25, 95);
    hidden.stability = clamp(h.stability + (rng() * 2 - 1) * 5, 25, 95);
    hidden.bias = clamp(h.bias + (rng() * 2 - 1) * 4, -25, 25);
    return Object.assign({}, content, { hidden: hidden });
  }

  function createRun(opts) {
    opts = opts || {};
    var seed = String(opts.seed || RNG.randomSeed());
    var rng = RNG.mulberry32(RNG.hashSeed(seed));
    var project = GC.projects.find(function (p) {
      return p.id === opts.projectId;
    }) || GC.projects[0];

    var selected = {};
    (opts.teamIds || []).forEach(function (id) {
      var content = GC.candidateTeams.find(function (t) {
        return t.id === id;
      });
      if (content) selected[content.direction] = content;
    });

    var teams = {};
    GC.directions.forEach(function (d) {
      var content = selected[d.id];
      if (!content) return;
      teams[d.id] = {
        direction: d.id,
        content: jitterTeamContent(content, seed),
        progress: 0,
        quality: 50,
        depNotes: [],
        lastGain: 0
      };
    });

    var missing = GC.directions.filter(function (d) {
      return !teams[d.id];
    });
    if (missing.length) {
      return { ok: false, message: "还有方向没有选团队：" + missing.map(function (d) { return d.name; }).join("、") };
    }

    var state = {
      seed: seed,
      rng: rng,
      project: project,
      month: 1,
      phase: "planning",
      teams: teams,
      initialBudget: project.budget - (opts.backgroundCheckCost || 0),
      budget: project.budget - (opts.backgroundCheckCost || 0),
      morale: 70,
      bugs: 0,
      coverage: 0,
      delayWeeks: 0,
      marketPenalty: 0,
      specScore: 0,
      signoffScore: 0,
      flags: {},
      usedEvents: [],
      delayed: [],
      pendingEvents: [],
      currentReport: null,
      lastTeamReports: {},
      lastGates: null,
      backgroundChecks: opts.backgroundChecks || [],
      backgroundWarningsUsed: [],
      teamEventsUsed: [],
      actionUsed: false,
      auditDirection: null,
      lastAction: null,
      waivers: [],
      evaluation: null,
      log: [],
      stats: { monthsPlayed: 0, actionsUsed: 0, eventsResolved: 0, backgroundChecks: (opts.backgroundChecks || []).length }
    };

    prepareMonth(state);
    state.log.push("M1 项目启动：" + seed + "（" + project.name + " 方向），6 个方向团队已锁定。");
    return state;
  }

  function chooseAction(state, actionId, targetDirection) {
    if (state.phase !== "planning") return { ok: false, message: "现在不是排兵阶段。" };
    if (state.actionUsed) return { ok: false, message: "本月已经做过决策了。" };
    var action = ACTIONS.find(function (a) {
      return a.id === actionId;
    });
    if (!action) return { ok: false, message: "没有这个决策。" };
    if (state.budget < action.cost) return { ok: false, message: "预算不够。" };
    if (action.once && state.flags["used_" + action.id]) return { ok: false, message: "这个决策已经用过了。" };
    if (action.id === "verify" && !isDirectionActive(state, "dv")) return { ok: false, message: "验证还没进场。" };
    if (action.needsTarget) {
      if (!targetDirection || !isDirectionActive(state, targetDirection)) {
        return { ok: false, message: "请选择一个本月活跃的方向。" };
      }
    }

    var before = {
      budget: state.budget,
      morale: state.morale,
      bugs: state.bugs,
      coverage: state.coverage,
      delayWeeks: state.delayWeeks,
      marketPenalty: state.marketPenalty
    };
    var beforeTeam = targetDirection
      ? { progress: state.teams[targetDirection].progress, quality: state.teams[targetDirection].quality }
      : null;
    var beforeDv = state.teams.dv
      ? { progress: state.teams.dv.progress }
      : null;

    state.budget -= action.cost;
    state.morale = clamp(state.morale + action.morale, 0, 100);
    state.actionUsed = true;
    state.stats.actionsUsed++;
    state.lastAction = { id: action.id, name: action.name, target: targetDirection || null };
    if (action.once) state.flags["used_" + action.id] = true;

    var note = "";
    var team = targetDirection ? state.teams[targetDirection] : null;

    if (action.id === "overtime") {
      var t1 = state.teams[targetDirection];
      var bonus = 15;
      var qualityPenalty = 3;
      if (hasTrait(t1, "eager")) {
        bonus += 7;
        qualityPenalty = 5;
        note = "年轻团队能加班，进度 +" + bonus + "。";
      }
      if (hasTrait(t1, "no_overtime")) {
        bonus = 5;
        qualityPenalty = 1;
        state.morale = clamp(state.morale + 4, 0, 100);
        note = "团队拒绝加班，进度只 +5。";
      }
      if (hasTrait(t1, "not_manageable")) {
        bonus = Math.max(1, Math.round(bonus * 0.5));
        state.morale = clamp(state.morale - 3, 0, 100);
        note = "团队不太听指挥，效果减半。";
      }
      t1.progress = clamp(t1.progress + bonus, 0, 100);
      t1.quality = clamp(t1.quality - qualityPenalty, 20, 100);
      if (t1.content.hidden.stability < 50) state.morale = clamp(state.morale - 4, 0, 100);
    } else if (action.id === "verify") {
      var dv = state.teams.dv;
      var verifyBonus = 10;
      var bugCut = 8;
      if (hasTrait(dv, "eager")) {
        verifyBonus = 15;
        bugCut = 12;
        note = "外包验证能加班，回归效果提升。";
      }
      if (hasTrait(dv, "no_overtime")) {
        verifyBonus = 5;
        bugCut = 4;
        note = "验证团队拒绝加班，回归效果减半。";
      }
      if (hasTrait(dv, "not_manageable")) {
        verifyBonus = Math.max(1, Math.round(verifyBonus * 0.5));
        bugCut = Math.max(1, Math.round(bugCut * 0.5));
        note = "验证团队不太听指挥，回归效果减半。";
      }
      dv.progress = clamp(dv.progress + verifyBonus, 0, 100);
      state.bugs = Math.max(0, state.bugs - bugCut);
    } else if (action.id === "ip") {
      var t2 = state.teams[targetDirection];
      var ipBonus = 20;
      if (hasTrait(t2, "not_manageable")) {
        ipBonus = 10;
        note = "团队不太听指挥，外包集成只完成一半。";
      }
      t2.progress = clamp(t2.progress + ipBonus, 0, 100);
      t2.quality = clamp(t2.quality - 2, 20, 100);
    } else if (action.id === "cut") {
      getActiveDirections(state).forEach(function (d) {
        state.teams[d.id].progress = clamp(state.teams[d.id].progress + 5, 0, 100);
      });
      state.marketPenalty += 8;
      state.flags.cut_scope = true;
    } else if (action.id === "paint") {
      var paintTeam = state.teams[targetDirection];
      var years = paintTeam.content.avgYears;
      var paintGain = years <= 3 ? 10 : years <= 5 ? 3 : -3;
      state.morale = clamp(state.morale + paintGain, 0, 100);
      if (years <= 3) {
        note = "平均 " + years + " 年，年轻人真信了，士气 +10。";
      } else if (years <= 5) {
        note = "平均 " + years + " 年，画饼勉强咽下去了，士气 +3。";
      } else {
        note = "平均 " + years + " 年，老油条说这饼没放盐，士气 -3。";
      }
    } else if (action.id === "raise") {
      var beforePayroll = totalSalary(state);
      Object.keys(state.teams).forEach(function (key) {
        var raiseTeam = state.teams[key];
        raiseTeam.content.salary = Math.round(raiseTeam.content.salary * 1.1 * 10) / 10;
      });
      note =
        "全员月薪永久 +10%，月薪合计 +" +
        Math.round((totalSalary(state) - beforePayroll) * 10) / 10 +
        " 万/月，士气 +12。";
    } else if (action.id === "teambuild") {
      if (state.rng() < 0.65) {
        state.morale = clamp(state.morale + 15, 0, 100);
        note = pick(TEAMBUILD_WINS, state.rng);
      } else {
        state.morale = clamp(state.morale - 4, 0, 100);
        note = pick(TEAMBUILD_FAILS, state.rng);
      }
    } else if (action.id === "audit") {
      state.auditDirection = targetDirection;
      if (hasTrait(team, "not_manageable")) {
        state.morale = clamp(state.morale - 5, 0, 100);
        note = "团队对审计有情绪，士气 -5。";
      }
    }

    function signed(n) {
      return (n >= 0 ? "+" : "") + Math.round(n);
    }
    var changes = [];
    if (targetDirection && beforeTeam) {
      var pd = state.teams[targetDirection].progress - beforeTeam.progress;
      var qd = state.teams[targetDirection].quality - beforeTeam.quality;
      if (Math.abs(pd) >= 0.5) changes.push("进度 " + signed(pd));
      if (Math.abs(qd) >= 0.5) changes.push("质量 " + signed(qd));
    }
    if (action.id === "verify" && beforeDv) {
      var vd = state.teams.dv.progress - beforeDv.progress;
      if (Math.abs(vd) >= 0.5) changes.push("验证进度 " + signed(vd));
    }
    if (action.id === "cut") changes.push("所有活跃方向 +5");
    if (action.id === "audit") changes.push("本月报告已审计");
    if (action.id === "raise") changes.push("全员月薪 +10%");
    var budgetDelta = state.budget - before.budget;
    if (Math.abs(budgetDelta) >= 0.5) changes.push("预算 " + signed(budgetDelta) + " 万");
    var moraleDelta = state.morale - before.morale;
    if (Math.abs(moraleDelta) >= 0.5) changes.push("士气 " + signed(moraleDelta));
    var bugDelta = state.bugs - before.bugs;
    if (Math.abs(bugDelta) >= 0.5) changes.push("bug " + signed(bugDelta));
    var coverageDelta = state.coverage - before.coverage;
    if (Math.abs(coverageDelta) >= 0.5) changes.push("覆盖 " + signed(coverageDelta));
    var delayDelta = state.delayWeeks - before.delayWeeks;
    if (Math.abs(delayDelta) >= 0.5) changes.push("延迟 " + signed(delayDelta) + " 周");
    var marketDelta = state.marketPenalty - before.marketPenalty;
    if (Math.abs(marketDelta) >= 0.5) changes.push("市场 " + signed(-marketDelta));
    if (!changes.length) changes.push(action.id === "skip" ? "本月不做额外动作" : "已记录");

    var result = {
      action: action.name,
      actionId: action.id,
      target: targetDirection || null,
      targetName: targetDirection ? state.teams[targetDirection].content.name : null,
      changes: changes,
      note: note || ""
    };
    state.lastAction.result = result;
    if (note) state.lastAction.note = note;
    state.log.push(
      "M" +
        state.month +
        " 决策：" +
        action.name +
        (targetDirection ? "（" + state.teams[targetDirection].content.name + "）" : "") +
        "。" +
        (note ? " " + note : "")
    );
    return { ok: true, action: action, note: note, result: result };
  }

  function applyEffects(state, effects) {
    if (!effects) return;
    if (effects.budget) state.budget += effects.budget;
    if (effects.morale) state.morale = clamp(state.morale + effects.morale, 0, 100);
    if (effects.progress) {
      Object.keys(effects.progress).forEach(function (k) {
        if (k === "spec") {
          ["arch", "algo"].forEach(function (dir) {
            if (state.teams[dir]) state.teams[dir].progress = clamp(state.teams[dir].progress + effects.progress[k], 0, 100);
          });
        } else if (state.teams[k]) {
          state.teams[k].progress = clamp(state.teams[k].progress + effects.progress[k], 0, 100);
        }
      });
    }
    if (effects.quality) {
      Object.keys(effects.quality).forEach(function (k) {
        if (k === "spec") {
          ["arch", "algo"].forEach(function (dir) {
            if (state.teams[dir]) state.teams[dir].quality = clamp(state.teams[dir].quality + effects.quality[k], 20, 100);
          });
        } else if (state.teams[k]) {
          state.teams[k].quality = clamp(state.teams[k].quality + effects.quality[k], 20, 100);
        }
      });
    }
    if (effects.coverage) state.coverage = clamp(state.coverage + effects.coverage, 0, 100);
    if (effects.bugs) state.bugs = clamp(state.bugs + effects.bugs, 0, 100);
    if (effects.delay) state.delayWeeks += effects.delay;
    if (effects.market) state.marketPenalty += effects.market;
    if (effects.flags) {
      effects.flags.forEach(function (f) {
        state.flags[f] = true;
      });
    }
    if (effects.delayed) {
      effects.delayed.forEach(function (d) {
        state.delayed.push({
          month: state.month + (d.months || 1),
          effects: d.effects,
          text: d.text || "上个月埋下的问题发作了。"
        });
      });
    }
  }

  function applyDelayed(state, report) {
    var due = state.delayed.filter(function (d) {
      return d.month <= state.month;
    });
    state.delayed = state.delayed.filter(function (d) {
      return d.month > state.month;
    });
    due.forEach(function (d) {
      applyEffects(state, d.effects);
      report.notes.push(d.text);
      state.log.push("M" + state.month + " 遗留问题：" + d.text);
    });
  }

  function hasTrait(team, trait) {
    return team.content.hidden.traits.indexOf(trait) >= 0;
  }

  function resolveTeam(state, team) {
    var h = team.content.hidden;
    var headcountFactor = 0.7 + 0.12 * Math.min(team.content.headcount, 8);
    var experienceFactor = 0.75 + Math.min(team.content.avgYears, 10) / 20;
    var skillFactor = 0.55 + h.skill / 200;
    var moraleFactor = 0.85 + state.morale / 500;
    var fit = team.content.fit || 1;
    var variance = hasTrait(team, "outsourced") ? 0.8 + state.rng() * 0.4 : 0.9 + state.rng() * 0.2;
    var gain = 24 * skillFactor * headcountFactor * experienceFactor * moraleFactor * fit * variance;
    var depNotes = [];

    if (team.direction === "rtl" && state.teams.arch.progress < 50) {
      gain *= 0.7;
      depNotes.push("架构未冻结，RTL 有返工风险。");
    }
    if (team.direction === "midend" && state.teams.rtl.progress < 55) {
      gain *= 0.7;
      depNotes.push("RTL 未到 0.75，综合反复。");
    }
    if (team.direction === "backend" && state.teams.midend.progress < 40) {
      gain *= 0.7;
      depNotes.push("中端 netlist 未清，后端返工。");
    }
    if (team.direction === "dv" && state.teams.rtl.progress < 25) {
      gain *= 0.7;
      depNotes.push("RTL 首版未出，验证空转。");
    }
    if (state.flags.arch_review_failed && team.direction === "rtl") gain *= 0.85;
    if (state.flags.arch_not_frozen && team.direction === "rtl") gain *= 0.85;
    if (hasTrait(team, "eager")) gain *= 1.04;
    if (hasTrait(team, "not_manageable")) {
      gain *= 0.93;
      depNotes.push("团队对管理有抵触，效率略低。");
    }

    team.progress = clamp(team.progress + gain, 0, 100);

    var qGain = (h.quality - 50) * 0.25 * experienceFactor;
    if (hasTrait(team, "not_manageable")) qGain -= 0.5;
    if (hasTrait(team, "outsourced")) qGain *= 0.8;
    if (hasTrait(team, "script_driven")) qGain -= 1;
    if (hasTrait(team, "coverage_theater")) qGain -= 0.5;
    if (hasTrait(team, "document_heavy")) qGain += 0.5;
    if (state.flags.m6_crunch) qGain -= 2;
    team.quality = clamp(team.quality + qGain, 25, 100);
    team.depNotes = depNotes;
    team.lastGain = gain;

    if (team.direction === "dv") {
      state.coverage = clamp(team.progress * 0.9 * (0.75 + team.quality / 200), 0, 100);
    }
    return { staff: [], depNotes: depNotes, gain: gain };
  }

  function applyFlightRisk(state, team, report) {
    var chance = 0;
    var loss = 10;
    if (hasTrait(team, "job_hopper")) {
      chance = state.morale < 60 ? 0.35 : 0.15;
      loss = 12;
    } else if (hasTrait(team, "high_turnover")) {
      chance = state.morale < 55 ? 0.3 : 0.1;
      loss = 10;
    }
    if (!chance) return;
    if (state.rng() < chance) {
      team.progress = Math.max(0, team.progress - loss);
      team.quality = Math.max(20, team.quality - 4);
      state.morale = clamp(state.morale - 5, 0, 100);
      var msg = team.content.name + " 核心成员被挖走，进度 -" + loss + "。";
      report.notes.push(msg);
      state.log.push("M" + state.month + " 人事：" + msg);
    }
  }

  function makePoachWarning(state, team) {
    var dir = team.direction;
    var p3 = {};
    var q2 = {};
    var p12 = {};
    var q4 = {};
    p3[dir] = -3;
    q2[dir] = -2;
    p12[dir] = -12;
    q4[dir] = -4;
    return {
      id: "bg_poach_" + team.content.id,
      title: "背调预警：核心成员被接触",
      text: "你背调时发现，" + team.content.name + " 的核心成员最近在接猎头电话。",
      options: [
        { label: "提前加薪/安抚（60 万）", effects: { budget: -60, morale: 8 }, result: "人暂时稳住了。" },
        { label: "准备 backup（30 万）", effects: { budget: -30, progress: p3, quality: q2 }, result: "你让 backup 开始接手关键模块。" },
        { label: "不理", effects: { progress: p12, quality: q4, morale: -5 }, result: "核心成员还是走了。" }
      ]
    };
  }

  function makeManagementWarning(state, team) {
    var dir = team.direction;
    var p3 = {};
    p3[dir] = -3;
    var styles = [];
    if (hasTrait(team, "no_overtime")) styles.push("不加班");
    if (hasTrait(team, "not_manageable")) styles.push("不服管");
    return {
      id: "bg_manage_" + team.content.id,
      title: "背调提醒：管理风格",
      text: "你背调时发现，" + team.content.name + " " + styles.join("、") + "。项目排期需要提前处理。",
      options: [
        { label: "提前沟通/调整排期", effects: { morale: 4 }, result: "团队情绪稳定。" },
        { label: "花钱安抚（30 万）", effects: { budget: -30, morale: 8 }, result: "团队情绪明显好转。" },
        { label: "照常强压", effects: { morale: -5, progress: p3 }, result: "团队开始消极应付。" }
      ]
    };
  }

  function buildBackgroundWarnings(state) {
    var events = [];
    var warned = [];
    getActiveDirections(state).forEach(function (d) {
      var team = state.teams[d.id];
      if (state.backgroundChecks.indexOf(team.content.id) < 0) return;
      if (state.backgroundWarningsUsed.indexOf(team.content.id) >= 0) return;
      var event = null;
      if (hasTrait(team, "job_hopper") || hasTrait(team, "high_turnover")) {
        event = makePoachWarning(state, team);
      } else if (hasTrait(team, "no_overtime") || hasTrait(team, "not_manageable")) {
        event = makeManagementWarning(state, team);
      }
      if (event) {
        events.push(event);
        warned.push(team.content.id);
        state.backgroundWarningsUsed.push(team.content.id);
      }
    });
    return { events: events, warned: warned };
  }

  function teamEventKind(state, team) {
    if (hasTrait(team, "no_overtime") && state.morale < 60) return "refuse";
    if (hasTrait(team, "eager") && state.morale < 55) return "burnout";
    if ((hasTrait(team, "outsourced") || hasTrait(team, "high_turnover")) && team.quality < 58) return "quality";
    if (hasTrait(team, "not_manageable") && state.morale < 55) return "conflict";
    if (hasTrait(team, "job_hopper") && state.morale < 55) return "poach";
    if (team.content.headcount <= 3) return "talent";
    return null;
  }

  function makeTeamEvent(state, team, kind) {
    var dir = team.direction;
    function p(v) {
      var o = {};
      o[dir] = v;
      return o;
    }
    if (kind === "refuse") {
      return {
        id: "team_refuse_" + team.content.id,
        title: "团队拒绝加班",
        text: "你要求 " + team.content.name + " 冲刺，但负责人表示不加班。",
        options: [
          { label: "调整排期", effects: { progress: p(-3), morale: 4 }, result: "你调整了排期，团队情绪稳定。" },
          { label: "强压", effects: { morale: -6, quality: p(-3) }, result: "团队开始消极应付。" },
          { label: "外包关键模块", effects: { budget: -30, progress: p(3), quality: p(-2) }, result: "外包接走了一部分工作，预算少了一截。" }
        ]
      };
    }
    if (kind === "burnout") {
      return {
        id: "team_burnout_" + team.content.id,
        title: "年轻团队开始疲劳",
        text: team.content.name + " 连续加班后，错误率开始上升。",
        options: [
          { label: "强制休息", effects: { morale: 8, progress: p(-3) }, result: "团队休息了两天，进度慢了一点。" },
          { label: "再顶一顶", effects: { progress: p(5), quality: p(-4), morale: -6 }, result: "进度上去了，错误率也上去了。" },
          { label: "加钱激励", effects: { budget: -30, morale: 6 }, result: "奖金到账，团队情绪好了一点。" }
        ]
      };
    }
    if (kind === "quality") {
      return {
        id: "team_quality_" + team.content.id,
        title: "外包质量波动",
        text: team.content.name + " 的交付质量出现波动，返工开始变多。",
        options: [
          { label: "加审计", effects: { budget: -30, quality: p(4) }, result: "审计压住了质量波动，预算少了一点。" },
          { label: "换供应商", effects: { budget: -45, progress: p(-4), quality: p(3) }, result: "换了供应商，交付质量回升，进度受影响。" },
          { label: "接受", effects: { quality: p(-3), bugs: 4 }, result: "你接受了波动，bug 开始变多。" }
        ]
      };
    }
    if (kind === "conflict") {
      return {
        id: "team_conflict_" + team.content.id,
        title: "团队不服从管理",
        text: team.content.name + " 对排期安排有异议，负责人开始不接电话。",
        options: [
          { label: "沟通", effects: { morale: 5, progress: p(-2) }, result: "你花了半天沟通，团队至少愿意说话了。" },
          { label: "强压", effects: { morale: -6, progress: p(3) }, result: "进度上去了，团队开始沉默。" },
          { label: "冷处理", effects: { morale: -3, quality: p(-2) }, result: "你决定不管，质量开始出现小问题。" }
        ]
      };
    }
    if (kind === "poach") {
      return {
        id: "team_poach_" + team.content.id,
        title: "核心成员突然提离职",
        text: team.content.name + " 的核心成员收到猎头 offer，直接来找你谈。",
        options: [
          { label: "加薪留人", effects: { budget: -60, morale: 6 }, result: "人留住了，预算少了一截。" },
          { label: "准备 backup", effects: { budget: -45, progress: p(-4), quality: p(-3) }, result: "你开始安排 backup，短期进度受影响。" },
          { label: "放走", effects: { progress: p(-12), quality: p(-4), morale: -5 }, result: "核心成员离开，团队士气受挫。" }
        ]
      };
    }
    return {
      id: "team_talent_" + team.content.id,
      title: "关键模块只有一个人",
      text: team.content.name + " 的关键模块没有 backup，负责人一请假就没人接。",
      options: [
        { label: "买 backup", effects: { budget: -30, progress: p(3), quality: p(2) }, result: "backup 到位，至少有人能接。" },
        { label: "内部培养", effects: { morale: 4, progress: p(-2), quality: p(2) }, result: "你安排内部培养，短期进度慢了一点。" },
        { label: "硬扛", effects: { flags: ["bus_factor"] }, result: "你决定先硬扛，风险留在了团队身上。" }
      ]
    };
  }

  function buildTeamEvents(state, backgroundWarned) {
    var active = getActiveDirections(state);
    for (var i = 0; i < active.length; i++) {
      var team = state.teams[active[i].id];
      if (state.teamEventsUsed.indexOf(team.content.id) >= 0) continue;
      if (state.backgroundChecks.indexOf(team.content.id) >= 0) continue;
      if (backgroundWarned.indexOf(team.content.id) >= 0) continue;
      var kind = teamEventKind(state, team);
      if (!kind) continue;
      state.teamEventsUsed.push(team.content.id);
      return { event: makeTeamEvent(state, team, kind), teamId: team.content.id };
    }
    return { event: null, teamId: null };
  }

  function updateBugs(state) {
    var rtl = state.teams.rtl;
    var arch = state.teams.arch;
    var dv = state.teams.dv;
    if (state.month >= 2 && state.month <= 5 && rtl.progress > 0) {
      var bugGen = (100 - rtl.quality) * 0.08 + state.project.complexity * 0.2;
      if (hasTrait(rtl, "lint_dirty")) bugGen *= 1.3;
      if (hasTrait(rtl, "eco_prone")) bugGen *= 1.15;
      bugGen += Math.max(0, 70 - arch.quality) * 0.04;
      state.bugs = clamp(state.bugs + bugGen, 0, 100);
    }
    if (state.month >= 2 && dv) {
      var find = (dv.progress / 100) * (dv.quality / 35) * 3.5 * (0.85 + dv.content.headcount / 30);
      if (hasTrait(dv, "coverage_theater")) find *= 0.8;
      state.bugs = clamp(state.bugs - find, 0, 100);
    }
  }

  function updateGates(state) {
    var T = state.teams;
    state.specScore = (T.arch.progress + T.algo.progress) / 2;
    var base = Math.min(T.backend.progress, T.midend.progress, T.dv.progress);
    state.signoffScore = clamp(base * 0.8 + state.coverage * 0.2, 0, 100);
    return {
      specScore: state.specScore,
      signoffScore: state.signoffScore
    };
  }

  function progressLabel(v) {
    if (v < 20) return "刚起步";
    if (v < 45) return "推进中";
    if (v < 70) return "过半";
    if (v < 90) return "接近完成";
    return "基本完成";
  }

  function makeQuote(state, team) {
    var tone = team.content.hidden.bias > 8 ? "opt" : team.content.hidden.bias < -8 ? "cau" : "neu";
    var lines = (QUOTES[team.direction] && QUOTES[team.direction][tone]) || ["还在推进。"];
    return pick(lines, state.rng);
  }

  function makeTeamReport(state, team) {
    var h = team.content.hidden;
    var lead = team.content.lead;
    var noise = (state.rng() * 2 - 1) * 6;
    var reported = clamp(team.progress + h.bias * 0.35 + noise, 0, 100);
    var audit = state.auditDirection === team.direction;
    var shown = audit ? team.progress : reported;
    var details = [];

    if (team.direction === "rtl") {
      details.push("RTL 版本：" + (shown < 50 ? "首版在收尾" : shown < 72 ? "0.75 在收尾" : shown < 90 ? "0.9 已交付" : "freeze 候选"));
    }
    if (team.direction === "dv") {
      var cov = audit ? state.coverage : clamp(state.coverage + h.bias * 0.2 + (state.rng() * 2 - 1) * 5 + (hasTrait(team, "coverage_theater") ? 15 : 0), 0, 100);
      details.push("覆盖率自报 " + Math.round(cov) + "%");
    }
    if (team.direction === "midend") {
      var viol = Math.round((100 - team.quality) * 0.8 + (100 - team.progress) * 0.2 + (state.rng() * 6 - 3));
      details.push("综合报告：setup violation " + Math.max(0, viol) + " 条");
      var power = Math.round((100 - team.quality) * 0.6 + (hasTrait(team, "low_power_gap") ? 20 : 0) + (state.rng() * 10 - 5));
      details.push(power > 20 ? "功耗余量告急" : "功耗余量正常");
    }
    if (team.direction === "backend") {
      var drc = Math.round((100 - team.quality) * 0.5 + (hasTrait(team, "drc_risk") ? 10 : 0) + (state.rng() * 6 - 3));
      details.push("DRC " + Math.max(0, drc) + " 处");
      details.push(team.quality < 60 ? "时序还没收敛" : "时序在收敛");
    }
    if (team.direction === "arch") details.push(hasTrait(team, "paper_tiger") ? "架构文档很漂亮" : "接口在收敛");
    if (team.direction === "algo") details.push(hasTrait(team, "no_production") ? "定点误差还没验" : "模型在跑");

    return {
      id: team.direction,
      direction: team.direction,
      name: team.content.name,
      lead: lead,
      status: progressLabel(shown),
      progress: shown,
      trueProgress: audit ? team.progress : null,
      quote: makeQuote(state, team),
      speaker: lead,
      details: details,
      audit: audit,
      teamInfo: team.content.headcount + " 人 · 平均 " + team.content.avgYears + " 年 · 月薪 " + team.content.salary + " 万",
      dep: team.depNotes.length ? team.depNotes[0] : null
    };
  }

  function pickEvents(state, count) {
    var eligible = GC.events.filter(function (e) {
      return (
        e.months.indexOf(state.month) >= 0 &&
        state.usedEvents.indexOf(e.id) < 0 &&
        (!e.requires || e.requires(state))
      );
    });
    var picked = [];
    for (var i = 0; i < count && eligible.length > 0; i++) {
      var total = eligible.reduce(function (s, e) {
        return s + (e.weight || 1);
      }, 0);
      var r = state.rng() * total;
      var idx = 0;
      for (var j = 0; j < eligible.length; j++) {
        r -= eligible[j].weight || 1;
        if (r <= 0) {
          idx = j;
          break;
        }
      }
      picked.push(eligible[idx]);
      eligible.splice(idx, 1);
    }
    picked.forEach(function (e) {
      state.usedEvents.push(e.id);
    });
    return picked;
  }

  function checkMilestones(state) {
    var msgs = [];
    var T = state.teams;
    var m = state.month;

    if (m === 1) {
      if (state.specScore < 25 || T.arch.progress < 25 || T.algo.progress < 25) {
        state.flags.arch_review_failed = true;
        state.morale = clamp(state.morale - 5, 0, 100);
        msgs.push({ ok: false, text: "M1 架构评审未过：RTL 启动会带着返工风险。" });
      } else {
        msgs.push({ ok: true, text: "M1 架构评审通过，规格和算法基线冻结。" });
      }
    }

    if (m === 2) {
      if (T.arch.progress < 50 || T.rtl.progress < 25 || T.dv.progress < 20) {
        if (T.arch.progress < 50) state.flags.arch_not_frozen = true;
        T.rtl.progress = Math.max(0, T.rtl.progress - 8);
        T.rtl.quality = Math.max(20, T.rtl.quality - 5);
        state.morale = clamp(state.morale - 3, 0, 100);
        msgs.push({ ok: false, text: "M2 架构未冻结：RTL 首版返工，进度 -8。" });
      } else {
        msgs.push({ ok: true, text: "M2 RTL 首版和验证环境就绪。" });
      }
    }

    if (m === 3) {
      if (T.rtl.progress < 55 || T.midend.progress < 22) {
        T.midend.progress = Math.max(0, T.midend.progress - 10);
        T.midend.quality = Math.max(20, T.midend.quality - 5);
        state.flags.rtl_late = true;
        state.morale = clamp(state.morale - 3, 0, 100);
        msgs.push({ ok: false, text: "M3 RTL 0.75 未达标：中端综合反复，进度 -10。" });
      } else {
        msgs.push({ ok: true, text: "M3 RTL 0.75 交付，中端完成第一次综合。" });
      }
    }

    if (m === 4) {
      if (T.rtl.progress < 80 || state.coverage < 30 || T.backend.progress < 15) {
        if (state.coverage < 30) {
          state.flags.coverage_gap = true;
          state.bugs += 5;
        }
        if (T.backend.progress < 15) state.flags.backend_late = true;
        state.morale = clamp(state.morale - 3, 0, 100);
        msgs.push({ ok: false, text: "M4 覆盖率或后端启动不及预期：逃逸 bug 风险上升。" });
      } else {
        msgs.push({ ok: true, text: "M4 RTL 0.9、覆盖率启动、后端进场。" });
      }
    }

    if (m === 5) {
      if (T.rtl.progress < 100 || state.coverage < 55 || T.backend.progress < 55 || state.signoffScore < 60) {
        state.flags.freeze_slipped = true;
        state.flags.m6_crunch = true;
        state.morale = clamp(state.morale - 5, 0, 100);
        state.delayWeeks += 1;
        msgs.push({ ok: false, text: "M5 freeze 没完全收住：M6 进入救火模式，窗口滑 1 周。" });
      } else {
        msgs.push({ ok: true, text: "M5 RTL freeze，验证和后端进入收敛。" });
      }
    }

    if (m === 6) {
      if (state.signoffScore < 65) {
        state.flags.signoff_incomplete = true;
        msgs.push({ ok: false, text: "M6 signoff 清单没齐：流片前只能硬做取舍。" });
      } else {
        msgs.push({ ok: true, text: "M6 进入 signoff：预算和窗口只够修一部分。" });
      }
    }

    return msgs;
  }

  function resolveMonth(state) {
    if (state.phase !== "planning") return { ok: false, message: "现在不是推进阶段。" };

    var report = {
      month: state.month,
      salary: totalSalary(state),
      notes: [],
      directions: [],
      events: [],
      milestones: [],
      gates: {},
      budgetBefore: state.budget,
      budgetAfter: 0
    };

    state.budget -= report.salary;
    if (state.budget < 0) {
      state.flags.budget_crisis = true;
      state.morale = clamp(state.morale - 8, 0, 100);
      report.notes.push("预算透支，全员士气 -8。");
    }

    applyDelayed(state, report);

    var background = buildBackgroundWarnings(state);
    var special = buildTeamEvents(state, background.warned);

    getActiveDirections(state).forEach(function (d) {
      var team = state.teams[d.id];
      resolveTeam(state, team);
      if (background.warned.indexOf(team.content.id) < 0 && special.teamId !== team.content.id) {
        applyFlightRisk(state, team, report);
      }
      report.directions.push(makeTeamReport(state, team));
    });

    updateBugs(state);
    var gates = updateGates(state);
    report.gates = {
      specScore: Math.round(gates.specScore),
      signoffScore: Math.round(gates.signoffScore),
      specLabel: gates.specScore < 35 ? "规格有风险" : gates.specScore < 70 ? "规格在收敛" : "规格稳定",
      signoffLabel: gates.signoffScore < 50 ? "signoff 有风险" : gates.signoffScore < 75 ? "signoff 在收敛" : "signoff 可控"
    };

    var eventCount = state.rng() < 0.4 ? 2 : 1;
    var events = pickEvents(state, eventCount);
    var backgroundPending = background.events.map(function (e) {
      return {
        id: e.id,
        title: e.title,
        text: e.text,
        options: e.options,
        resolved: false,
        chosen: null,
        resultText: null
      };
    });
    var specialPending = special.event
      ? [
          {
            id: special.event.id,
            title: special.event.title,
            text: special.event.text,
            options: special.event.options,
            resolved: false,
            chosen: null,
            resultText: null
          }
        ]
      : [];
    state.pendingEvents = backgroundPending.concat(specialPending).concat(
      events.map(function (e) {
        return {
          id: e.id,
          title: e.title,
          text: e.text,
          options: e.options,
          resolved: false,
          chosen: null,
          resultText: null
        };
      })
    );
    report.events = state.pendingEvents;

    report.milestones = checkMilestones(state);
    report.budgetAfter = state.budget;
    report.morale = state.morale;
    report.coverage = state.coverage;
    report.bugs = state.bugs;
    report.delayWeeks = state.delayWeeks;

    state.lastTeamReports = {};
    report.directions.forEach(function (t) {
      state.lastTeamReports[t.direction] = t;
    });
    state.lastGates = report.gates;

    state.stats.monthsPlayed++;
    state.currentReport = report;
    state.phase = "report";
    return report;
  }

  function resolveEvent(state, eventId, optionIndex) {
    var ev = state.pendingEvents.find(function (e) {
      return e.id === eventId;
    });
    if (!ev) return { ok: false, message: "没有这个事件。" };
    if (ev.resolved) return { ok: false, message: "这个事件已经处理过了。" };
    var opt = ev.options[optionIndex];
    if (!opt) return { ok: false, message: "没有这个选项。" };

    applyEffects(state, opt.effects);
    ev.resolved = true;
    ev.chosen = opt.label;
    ev.resultText = opt.result;
    state.stats.eventsResolved++;
    state.log.push("M" + state.month + " 事件「" + ev.title + "」：" + opt.label + "。");
    return { ok: true, event: ev, option: opt, result: opt.result };
  }

  function allEventsResolved(state) {
    return state.pendingEvents.every(function (e) {
      return e.resolved;
    });
  }

  function advanceMonth(state) {
    if (state.phase !== "report") return { ok: false, message: "现在不是月报阶段。" };
    if (!allEventsResolved(state)) return { ok: false, message: "还有突发事件没处理。" };

    if (state.month >= 6) {
      generateWaivers(state);
      return { ok: true, phase: "waiver" };
    }

    state.month += 1;
    prepareMonth(state);
    state.log.push("进入 M" + state.month + "。");
    return { ok: true, phase: "planning" };
  }

  function generateWaivers(state) {
    var eligible = GC.waivers.filter(function (w) {
      return !w.requires || w.requires(state);
    });
    eligible.sort(function (a, b) {
      return b.trueRisk - a.trueRisk;
    });

    var items = eligible.slice(0, 6).map(function (w) {
      return {
        id: w.id,
        category: w.category,
        label: w.label,
        hint: w.hint,
        trueRisk: w.trueRisk,
        fixCost: w.fixCost,
        fixWeeks: w.fixWeeks,
        fixed: false,
        waived: false
      };
    });

    var fi = 0;
    while (items.length < 6 && fi < GC.waiverFillers.length) {
      var f = GC.waiverFillers[fi++];
      if (
        items.some(function (i) {
          return i.id === f.id;
        })
      ) {
        continue;
      }
      items.push({
        id: f.id,
        category: f.category,
        label: f.label,
        hint: f.hint,
        trueRisk: f.trueRisk,
        fixCost: f.fixCost,
        fixWeeks: f.fixWeeks,
        fixed: false,
        waived: false
      });
    }

    state.waivers = items;
    state.phase = "waiver";
    state.log.push("M6 signoff：生成 " + items.length + " 条 waive 项。");
    return items;
  }

  function setWaiver(state, waiverId, decision) {
    if (state.phase !== "waiver") return { ok: false, message: "现在不是 signoff 阶段。" };
    var w = state.waivers.find(function (x) {
      return x.id === waiverId;
    });
    if (!w) return { ok: false, message: "没有这个 waive 项。" };

    if (w.fixed) {
      state.budget += w.fixCost;
      state.delayWeeks -= w.fixWeeks;
    }
    w.fixed = false;
    w.waived = false;

    if (decision === "fix") {
      state.budget -= w.fixCost;
      state.delayWeeks += w.fixWeeks;
      w.fixed = true;
    } else {
      w.waived = true;
    }

    return { ok: true, waiver: w };
  }

  function submitWaivers(state) {
    if (state.phase !== "waiver") return { ok: false, message: "现在不是 signoff 阶段。" };
    state.waivers.forEach(function (w) {
      if (!w.fixed && !w.waived) w.waived = true;
    });

    var evaluation = evaluateTapeout(state);
    state.evaluation = evaluation;
    state.phase = "result";
    state.log.push("流片评估：" + evaluation.ending.title + "。");
    return evaluation;
  }

  function traitRiskOf(state) {
    var weights = {
      lint_dirty: 0.03,
      eco_prone: 0.03,
      outsourced: 0.04,
      coverage_theater: 0.04,
      script_driven: 0.03,
      drc_risk: 0.04,
      signoff_risk: 0.04,
      junior: 0.02,
      high_turnover: 0.02,
      integration_risk: 0.03,
      no_production: 0.02,
      paper_tiger: 0.02,
      job_hopper: 0.02,
      no_overtime: 0.02,
      not_manageable: 0.03,
      low_power_gap: 0.03
    };
    var risk = 0;
    Object.keys(state.teams).forEach(function (key) {
      state.teams[key].content.hidden.traits.forEach(function (t) {
        risk += weights[t] || 0;
      });
    });
    return Math.min(0.35, risk);
  }

  function lowerGrade(grade) {
    return grade === "S" ? "A" : grade === "A" ? "B" : grade === "B" ? "C" : "D";
  }

  function evaluateTapeout(state) {
    var waived = state.waivers.filter(function (w) {
      return !w.fixed;
    });
    var fixed = state.waivers.filter(function (w) {
      return w.fixed;
    });
    var risk =
      waived.reduce(function (s, w) {
        return s + w.trueRisk;
      }, 0) +
      fixed.reduce(function (s, w) {
        return s + w.trueRisk * 0.2;
      }, 0);
    var fixRisk = fixed.length * 0.04;
    var effectiveRisk = risk + fixRisk;

    var coverage = state.coverage;
    var bugs = state.bugs;
    var T = state.teams;
    var quality = (T.backend.quality + T.midend.quality + T.rtl.quality) / 3;
    var coveragePenalty = Math.max(0, 90 - coverage) / 100;
    var bugPenalty = Math.min(0.35, bugs * 0.015);
    var qualityBonus = Math.max(-0.15, Math.min(0.1, ((quality - 65) / 100) * 0.3));
    var archPenalty = (Math.max(0, 70 - T.arch.quality) / 100) * 0.1;
    var specPenalty =
      (Math.max(0, 70 - (T.arch.quality + T.algo.quality) / 2) / 100) * 0.15 +
      (Math.max(0, 60 - state.specScore) / 100) * 0.1;
    var algoPenalty =
      (Math.max(0, 70 - T.algo.quality) / 100) * 0.15 +
      (Math.max(0, 90 - T.algo.progress) / 100) * 0.1;
    var overspend = Math.max(0, -state.budget) / Math.max(1, state.initialBudget);
    var traitRisk = traitRiskOf(state);

    var pWorks = clamp(
      0.93 -
        effectiveRisk * 0.14 -
        coveragePenalty * 0.7 -
        bugPenalty +
        qualityBonus -
        archPenalty -
        specPenalty -
        algoPenalty -
        overspend * 0.8 -
        traitRisk * 0.5,
      0.05,
      0.95
    );
    var works = state.rng() < pWorks;
    var condition = "works";
    if (!works) {
      condition = state.rng() < 0.35 ? "partial" : "dead";
    }

    var severe = "none";
    if (works) {
      var pSevere = clamp(
        effectiveRisk * 0.06 +
          bugPenalty * 0.5 +
          Math.max(0, 85 - coverage) * 0.008 +
          (archPenalty + specPenalty + algoPenalty) * 0.6 +
          overspend * 0.35 +
          traitRisk * 0.35,
        0,
        0.85
      );
      if (state.rng() < pSevere) severe = state.rng() < 0.35 ? "fatal" : "major";
      else if (state.rng() < 0.3) severe = "minor";
    }

    var costRatio = Math.max(0, state.initialBudget - state.budget) / state.initialBudget;
    var pMP = clamp(
      0.94 -
        effectiveRisk * 0.06 -
        Math.max(0, 90 - coverage) * 0.012 -
        (100 - quality) * 0.003 -
        costRatio * 0.08 -
        (archPenalty + specPenalty + algoPenalty) * 0.5 -
        overspend * 0.5 -
        traitRisk * 0.4,
      0.05,
      0.95
    );
    var mp = works && severe !== "fatal" && state.rng() < pMP;

    var overspendTier = overspend <= 0 ? "none" : overspend <= 0.2 ? "rating" : "collapse-roll";
    var pCashCrash = overspend > 0.2 ? clamp(overspend, 0, 0.95) : 0;
    var cashCrash = false;
    if (works && severe !== "fatal" && overspend > 0.2) {
      cashCrash = state.rng() < pCashCrash;
      if (cashCrash) mp = false;
    }
    var budgetRatingPenalty = overspend > 0 ? 1 : 0;

    var onTime = state.delayWeeks <= 0;
    var market = clamp(
      100 -
        state.marketPenalty -
        state.delayWeeks * 8 -
        (state.flags.spec_ambiguous ? 5 : 0) -
        (state.flags.cut_scope ? 5 : 0) -
        (state.flags.algo_risk ? 5 : 0) -
        Math.max(0, 70 - (T.arch.quality + T.algo.quality) / 2) * 0.4,
      0,
      100
    );

    var functionScore = 0;
    if (works) functionScore += 18;
    if (condition === "works") functionScore += 4;
    if (severe === "none") functionScore += 10;
    else if (severe === "minor") functionScore += 7;
    else if (severe === "major") functionScore += 3;
    functionScore += Math.min(8, coverage / 12.5);

    var marketScore = market / 5;
    var costScore = clamp(state.budget / state.initialBudget, 0, 1) * 20;
    var timeScore = onTime ? 20 : Math.max(0, 20 - state.delayWeeks * 5);
    var total = functionScore + marketScore + costScore + timeScore;
    if (!mp) total = Math.min(total, 69);
    if (severe === "fatal") total = Math.min(total, 49);
    if (!works) total = Math.min(total, 49);
    if (cashCrash) total = Math.min(total, 49);

    var grade = total >= 90 ? "S" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : "D";
    if (cashCrash) grade = "D";
    else if (budgetRatingPenalty) grade = lowerGrade(grade);

    var evaluation = {
      works: works,
      condition: condition,
      severe: severe,
      mp: mp,
      onTime: onTime,
      market: Math.round(market),
      budgetRemaining: state.budget,
      risk: Math.round(risk * 100) / 100,
      fixRisk: Math.round(fixRisk * 100) / 100,
      fixCount: fixed.length,
      fixCost: fixed.reduce(function (s, w) {
        return s + w.fixCost;
      }, 0),
      traitRisk: Math.round(traitRisk * 100) / 100,
      coverage: Math.round(coverage * 10) / 10,
      bugs: Math.round(bugs * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      pWorks: Math.round(pWorks * 100) / 100,
      pSevere:
        Math.round(
          clamp(
            effectiveRisk * 0.06 +
              bugPenalty * 0.5 +
              Math.max(0, 85 - coverage) * 0.008 +
              (archPenalty + specPenalty + algoPenalty) * 0.6 +
              overspend * 0.35 +
              traitRisk * 0.35,
            0,
            0.85
          ) * 100
        ) / 100,
      pMP: Math.round(pMP * 100) / 100,
      delayWeeks: state.delayWeeks,
      score: Math.round(total),
      grade: grade,
      overspend: Math.round(overspend * 100) / 100,
      overspendPct: Math.round(overspend * 1000) / 10,
      overspendTier: overspendTier,
      budgetRatingPenalty: budgetRatingPenalty,
      pCashCrash: Math.round(pCashCrash * 100) / 100,
      cashCrash: cashCrash,
      waived: waived.map(function (w) {
        return { id: w.id, label: w.label, trueRisk: w.trueRisk };
      }),
      fixed: fixed.map(function (w) {
        return { id: w.id, label: w.label, trueRisk: w.trueRisk };
      })
    };

    evaluation.ending = GC.endings.find(function (e) {
      return e.condition(evaluation);
    }) || GC.endings[GC.endings.length - 1];

    return evaluation;
  }

  function getTruth(state) {
    return {
      seed: state.seed,
      project: state.project,
      teams: GC.directions.map(function (d) {
        var team = state.teams[d.id];
        return {
          direction: d.id,
          directionName: d.name,
          name: team.content.name,
          lead: team.content.lead,
          headcount: team.content.headcount,
          salary: team.content.salary,
          avgYears: team.content.avgYears,
          levels: team.content.levels,
          desc: team.content.desc,
          tags: team.content.tags,
          clues: team.content.clues,
          fit: team.content.fit,
          hidden: team.content.hidden,
          progress: Math.round(team.progress),
          quality: Math.round(team.quality)
        };
      }),
      waivers: state.waivers.map(function (w) {
        return {
          id: w.id,
          label: w.label,
          trueRisk: w.trueRisk,
          fixed: w.fixed,
          waived: w.waived
        };
      }),
      flags: Object.keys(state.flags).filter(function (k) {
        return state.flags[k];
      }),
      log: state.log,
      evaluation: state.evaluation
    };
  }

  global.GameEngine = {
    DIRECTIONS: GC.directions,
    ACTIONS: ACTIONS,
    createRun: createRun,
    chooseAction: chooseAction,
    resolveMonth: resolveMonth,
    resolveEvent: resolveEvent,
    allEventsResolved: allEventsResolved,
    advanceMonth: advanceMonth,
    generateWaivers: generateWaivers,
    setWaiver: setWaiver,
    submitWaivers: submitWaivers,
    getTruth: getTruth,
    getActiveDirections: getActiveDirections,
    getTeam: getTeam,
    totalSalary: totalSalary,
    progressLabel: progressLabel,
    traitRiskOf: traitRiskOf,
    clamp: clamp
  };
})(typeof window !== "undefined" ? window : globalThis);
