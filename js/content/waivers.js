(function (global) {
  var GC = (global.GameContent = global.GameContent || {});

  function hasTrait(team, trait) {
    return team && team.content.hidden.traits.indexOf(trait) >= 0;
  }

  GC.waivers = [
    {
      id: "hold_scan",
      category: "时序",
      label: "scan chain hold violation -18ps",
      hint: "scan chain 上的 hold，测试模式可能起不来。",
      trueRisk: 0.8,
      fixCost: 75,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.quality < 78 || s.teams.rtl.quality < 65;
      }
    },
    {
      id: "setup_test",
      category: "时序",
      label: "test mode setup violation -12ps",
      hint: "只影响 test mode，功能路径余量看起来还可以。",
      trueRisk: 0.25,
      fixCost: 45,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.progress < 95;
      }
    },
    {
      id: "drc_density",
      category: "DRC",
      label: "metal density 12 处",
      hint: "密度违规，代工厂可能要求 waiver。",
      trueRisk: 0.45,
      fixCost: 60,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.quality < 82;
      }
    },
    {
      id: "lvs_via",
      category: "LVS",
      label: "LVS missing via 3 处",
      hint: "LVS 没过，通常不是小事。",
      trueRisk: 0.75,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.quality < 72 || hasTrait(s.teams.backend, "drc_risk");
      }
    },
    {
      id: "power_over",
      category: "功耗",
      label: "功耗超预算 22%",
      hint: "动态功耗超标，封装和散热要重新评估。",
      trueRisk: 0.6,
      fixCost: 120,
      fixWeeks: 2,
      requires: function (s) {
        return s.teams.midend.quality < 78 || s.project.requirements.power > 0.8;
      }
    },
    {
      id: "dft_coverage",
      category: "DFT",
      label: "DFT 覆盖率 86%",
      hint: "量产测试覆盖不足，良率会受影响。",
      trueRisk: 0.55,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.midend.progress < 88;
      }
    },
    {
      id: "func_bug",
      category: "功能",
      label: "DMA burst 死锁",
      hint: "已知功能 bug，软件可能绕不过去。",
      trueRisk: 0.8,
      fixCost: 120,
      fixWeeks: 2,
      requires: function (s) {
        return s.bugs > 6 || s.flags.known_bug;
      }
    },
    {
      id: "coverage_gap",
      category: "验证",
      label: "覆盖率 88%，3 个 corner 未覆盖",
      hint: "没覆盖到的 corner，可能正好是硅上的坑。",
      trueRisk: 0.5,
      fixCost: 75,
      fixWeeks: 1,
      requires: function (s) {
        return s.coverage < 92 || hasTrait(s.teams.dv, "coverage_theater");
      }
    },
    {
      id: "ir_drop",
      category: "电源",
      label: "IR drop 超 8%",
      hint: "电源网络偏弱，峰值负载下可能掉压。",
      trueRisk: 0.65,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.quality < 68;
      }
    },
    {
      id: "clock_tree",
      category: "时序",
      label: "clock tree skew 偏大",
      hint: "时钟树还没完全收敛，高频 corner 有风险。",
      trueRisk: 0.6,
      fixCost: 75,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.backend.quality < 75;
      }
    },
    {
      id: "yield_margin",
      category: "良率",
      label: "良率 margin 不足 3%",
      hint: "工艺角 margin 偏薄，量产良率可能不达标。",
      trueRisk: 0.5,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return s.teams.midend.quality < 70;
      }
    },
    {
      id: "signoff_gap",
      category: "Signoff",
      label: "signoff 清单缺 3 项",
      hint: "清单没齐就流片，等于把未知留给硅。",
      trueRisk: 0.6,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return s.signoffScore < 65;
      }
    },
    {
      id: "eco_gap",
      category: "ECO",
      label: "ECO 清单还有 3 项",
      hint: "RTL 团队的 lint 和 ECO 习惯，通常会在流片前一起还债。",
      trueRisk: 0.6,
      fixCost: 90,
      fixWeeks: 1,
      requires: function (s) {
        return hasTrait(s.teams.rtl, "eco_prone") || hasTrait(s.teams.rtl, "lint_dirty");
      }
    },
    {
      id: "coverage_theater",
      category: "验证",
      label: "覆盖率 91%，定向用例不足",
      hint: "数字很好看，但很多是重复用例。",
      trueRisk: 0.55,
      fixCost: 75,
      fixWeeks: 1,
      requires: function (s) {
        return hasTrait(s.teams.dv, "coverage_theater");
      }
    },
    {
      id: "low_power_gap",
      category: "功耗",
      label: "低功耗方案只套了模板",
      hint: "新工艺下模板不一定管用，峰值功耗会暴露。",
      trueRisk: 0.6,
      fixCost: 105,
      fixWeeks: 2,
      requires: function (s) {
        return hasTrait(s.teams.midend, "low_power_gap");
      }
    },
    {
      id: "esd",
      category: "可靠性",
      label: "ESD 余量 1.8kV（目标 2kV）",
      hint: "封装厂可能接受，可靠性部门不一定。",
      trueRisk: 0.3,
      fixCost: 30,
      fixWeeks: 1,
      requires: function () {
        return true;
      }
    }
  ];

  GC.waiverFillers = [
    {
      id: "esd_fill",
      category: "可靠性",
      label: "ESD 余量 1.8kV（目标 2kV）",
      hint: "封装厂可能接受，可靠性部门不一定。",
      trueRisk: 0.3,
      fixCost: 30,
      fixWeeks: 1
    },
    {
      id: "setup_fill",
      category: "时序",
      label: "test mode setup violation -12ps",
      hint: "只影响 test mode，功能路径余量看起来还可以。",
      trueRisk: 0.25,
      fixCost: 45,
      fixWeeks: 1
    },
    {
      id: "drc_fill",
      category: "DRC",
      label: "metal density 8 处",
      hint: "密度违规，代工厂可能要求 waiver。",
      trueRisk: 0.4,
      fixCost: 60,
      fixWeeks: 1
    }
  ];
})(typeof window !== "undefined" ? window : globalThis);
