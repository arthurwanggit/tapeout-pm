(function (global) {
  var E = global.GameEngine;
  var C = global.GameContent;
  var RNG = global.RNG;

  var app = document.getElementById("app");
  var modalRoot = document.getElementById("modalRoot");
  var toastEl = document.getElementById("toast");

  var UI = {
    screen: "title",
    seed: "",
    projectId: "xuanwu1",
    selectedTeams: {},
    checkedTeams: {},
    backgroundCost: 0,
    game: null,
    report: null,
    lastRenderScreen: null,
    toastTimer: null,
    forceScrollTop: false,
    decisionAction: null,
    decisionDirection: null,
    confirmWaiveAll: false,
    confirmSubmit: false,
    shareImageDataUrl: null
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function randomProjectName() {
    var prefixes = ["玄武", "朱雀", "青龙", "白虎", "麒麟", "鲲鹏", "天枢", "摇光", "昆仑", "蓬莱"];
    var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + "-" + (Math.floor(Math.random() * 90) + 10);
  }

  function currentProject() {
    return C.projects.find(function (p) {
      return p.id === UI.projectId;
    }) || C.projects[0];
  }

  function directionById(id) {
    return C.directions.find(function (d) {
      return d.id === id;
    });
  }

  function teamById(id) {
    return C.candidateTeams.find(function (t) {
      return t.id === id;
    });
  }

  function selectedTeamList() {
    return Object.keys(UI.selectedTeams)
      .map(function (direction) {
        return teamById(UI.selectedTeams[direction]);
      })
      .filter(Boolean);
  }

  function selectedTeamIds() {
    return selectedTeamList().map(function (t) {
      return t.id;
    });
  }

  function selectedHeadcount() {
    return selectedTeamList().reduce(function (sum, t) {
      return sum + t.headcount;
    }, 0);
  }

  function selectedPayroll() {
    return selectedTeamList().reduce(function (sum, t) {
      return sum + t.salary;
    }, 0);
  }

  function selectedDirectionCount() {
    return selectedTeamList().length;
  }

  function directionName(id) {
    var d = directionById(id);
    return d ? d.name : id;
  }

  function levelsLabel(levels) {
    var parts = [
      ["top", "顶级"],
      ["expert", "专家"],
      ["senior", "资深"],
      ["engineer", "工程师"],
      ["junior", "新人"]
    ];
    return parts
      .filter(function (p) {
        return levels[p[0]] > 0;
      })
      .map(function (p) {
        return levels[p[0]] + " " + p[1];
      })
      .join(" / ");
  }

  function mixLabel(team) {
    return levelsLabel(team.levels);
  }

  function moraleLabel(m) {
    if (m >= 70) return "稳定";
    if (m >= 45) return "疲惫";
    if (m >= 25) return "低落";
    return "崩溃边缘";
  }

  function activeDirections() {
    if (!UI.game) return [];
    return E.getActiveDirections(UI.game);
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 1900);
  }

  function showModal(inner) {
    modalRoot.innerHTML = '<div class="sheet-backdrop"><div class="sheet">' + inner + "</div></div>";
    document.body.classList.add("modal-open");
  }

  function hideModal() {
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function effectChips(result) {
    if (!result || !result.changes || !result.changes.length) return "";
    return (
      '<div class="effect-chips">' +
      result.changes
        .map(function (change) {
          return '<span class="effect-chip">' + esc(change) + "</span>";
        })
        .join("") +
      "</div>"
    );
  }

  function decisionSummary(s) {
    var r = s.lastAction && s.lastAction.result;
    if (!r) return "点击下方按钮推进到 M" + s.month + " 月报。";
    var parts = [r.action + (r.targetName ? " · " + r.targetName : "")].concat(r.changes.slice(0, 4));
    if (r.note) parts.push(r.note);
    return parts.join(" · ") + "。点击下方按钮推进到月报。";
  }

  function decisionBanner(title, text) {
    return (
      '<div class="decision-banner"><span class="decision-pill">需要决策</span>' +
      '<div class="decision-title">' +
      esc(title) +
      '</div><div class="decision-text">' +
      esc(text) +
      "</div></div>"
    );
  }

  function nextBanner(title, text) {
    return (
      '<div class="decision-banner next"><span class="decision-pill">下一步</span>' +
      '<div class="decision-title">' +
      esc(title) +
      '</div><div class="decision-text">' +
      esc(text) +
      "</div></div>"
    );
  }

  function topbar() {
    var s = UI.game;
    if (!s) return "";
    return (
      '<div class="topbar">' +
      '<div class="topbar-item"><span class="topbar-label">月份</span><span class="topbar-value">M' +
      s.month +
      "/6</span></div>" +
      '<div class="topbar-item"><span class="topbar-label">预算</span><span class="topbar-value ' +
      (s.budget < 0 ? "danger" : "") +
      '">' +
      Math.round(s.budget) +
      " 万</span></div>" +
      '<div class="topbar-item"><span class="topbar-label">士气</span><span class="topbar-value">' +
      moraleLabel(s.morale) +
      "</span></div>" +
      '<div class="topbar-item"><span class="topbar-label">项目名</span><span class="topbar-value mono">' +
      esc(s.seed) +
      "</span></div>" +
      "</div>"
    );
  }

  function budgetCrisisNotice(s) {
    if (!s || s.budget >= 0) return "";
    var pct = Math.round((Math.max(0, -s.budget) / Math.max(1, s.initialBudget)) * 1000) / 10;
    var detail =
      pct > 20
        ? "当前超支 " +
          pct +
          "%。最终等待量产时按超支比例判定资金链断裂（约 " +
          Math.min(95, pct) +
          "%）；即使没断，评级也会 -1。"
        : "当前超支 " + pct + "%。最终评级 -1；暂不触发资金链断裂判定。";
    return (
      '<div class="budget-crisis">' +
      '<div class="budget-crisis-title">资金链断裂传言</div>' +
      '<div class="budget-crisis-text">' +
      esc("资金链断裂的传言在团队里扩散，全员士气已经受影响。" + detail) +
      "</div></div>"
    );
  }

  function renderTitle() {
    return (
      '<div class="wrap title-screen">' +
      '<div class="brand-mark">SILICON / PM</div>' +
      "<h1>流片吧，PM</h1>" +
      '<p class="author">作者：一维空间</p>' +
      '<p class="lead">6 个月，六个团队，一颗芯片。流程不会等你，月报也不一定是真的。</p>' +
      decisionBanner("开始新项目", "给项目起个名字，或留空随机生成。") +
      '<div class="panel">' +
      '<div class="field-label">项目名称</div>' +
      '<input id="seedInput" class="input" maxlength="20" placeholder="例如：我的通信芯片" value="' +
      esc(UI.seed) +
      '">' +
      '<div class="fine" style="margin:-4px 0 12px">同名会复现同一局（相当于随机种子）；留空随机生成。</div>' +
      '<button class="btn primary block attention" data-act="start">开始新项目</button>' +
      "</div>" +
      '<div class="card subtle">' +
      '<div class="mini-title">怎么玩</div>' +
      '<ul class="how-list">' +
      "<li>先为 6 个方向各选一个团队，选中即锁定该方向负责人。</li>" +
      "<li>团队人数、月薪、平均年限可见；真实战力不可见，只能看描述和背调线索。</li>" +
      "<li>每月先选动作，再选动作下的方向或确认；选完才能推进。M6 做 signoff 取舍，然后流片。</li>" +
      "</ul>" +
      "</div>" +
      '<p class="fine">纯离线文字游戏。人物与项目均为虚构。</p>' +
      "</div>"
    );
  }

  function teamCard(team) {
    var selected = UI.selectedTeams[team.direction] === team.id;
    var locked = !!UI.selectedTeams[team.direction] && !selected;
    var checked = Object.prototype.hasOwnProperty.call(UI.checkedTeams, team.id);
    var clue = checked ? team.clues[UI.checkedTeams[team.id]] : "";
    return (
      '<div class="candidate team-card ' +
      (selected ? "selected " : "") +
      (locked ? "blocked" : "") +
      '">' +
      '<div class="candidate-head">' +
      "<div><div class=\"name\">" +
      esc(team.name) +
      '</div><div class="role">' +
      esc(directionName(team.direction)) +
      " · " +
      team.headcount +
      " 人 · 月薪 " +
      team.salary +
      " 万 · 平均 " +
      team.avgYears +
      " 年</div></div>" +
      '<button class="btn small ' +
      (selected ? "secondary" : "primary") +
      '" data-act="toggle-team" data-id="' +
      team.id +
      '" ' +
      (locked ? "disabled" : "") +
      ">" +
      (selected ? "取消" : locked ? "已锁定" : "选择") +
      "</button>" +
      "</div>" +
      '<div class="mix-line">' +
      esc(mixLabel(team)) +
      "</div>" +
      '<p class="pitch">' +
      esc(team.desc) +
      "</p>" +
      '<div class="tags">' +
      team.tags
        .map(function (t) {
          return '<span class="tag">' + esc(t) + "</span>";
        })
        .join("") +
      "</div>" +
      '<div class="btn-group" style="margin-top:10px">' +
      '<button class="btn ghost small" data-act="team-detail" data-id="' +
      team.id +
      '">团队详情</button>' +
      (checked
        ? ""
        : '<button class="btn ghost small" data-act="background-team" data-id="' +
          team.id +
          '">背调 -15 万</button>') +
      "</div>" +
      (checked ? '<div class="clue">背调线索：' + esc(clue) + "</div>" : "") +
      "</div>"
    );
  }

  function displayedTeams(direction) {
    var teams = C.candidateTeams.filter(function (team) {
      return team.direction === direction;
    });
    var rng = RNG.mulberry32(RNG.hashSeed(UI.seed + ":pool:" + direction));
    var arr = teams.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, 3);
  }

  function renderTeamSelect() {
    var p = currentProject();
    var dirCount = selectedDirectionCount();
    var remaining = C.directions.length - dirCount;
    var headcount = selectedHeadcount();
    var payroll = selectedPayroll();
    var projected = payroll * p.months;
    var actualBudget = p.budget - UI.backgroundCost;
    var overBudget = projected > actualBudget;
    return (
      '<div class="wrap">' +
      '<div class="row between" style="margin-bottom:14px">' +
      '<div><div class="kicker">芯片方向</div><div class="h2">' +
      esc(p.name) +
      "</div></div>" +
      '<button class="btn ghost small" data-act="back-title">返回</button>' +
      "</div>" +
      '<div class="card">' +
      '<div class="fine" style="margin-top:0">项目名称：' +
      esc(UI.seed) +
      "（同名复现同一局）</div>" +
      '<p class="body">' +
      esc(p.brief) +
      "</p>" +
      '<div class="stats-row">' +
      '<div class="stat"><div class="stat-label">预算</div><div class="stat-value">' +
      p.budget +
      " 万</div></div>" +
      '<div class="stat"><div class="stat-label">背调已花</div><div class="stat-value">' +
      UI.backgroundCost +
      " 万</div></div>" +
      '<div class="stat"><div class="stat-label">已选方向</div><div class="stat-value">' +
      dirCount +
      "/" +
      C.directions.length +
      "</div></div>" +
      '<div class="stat"><div class="stat-label">团队人数</div><div class="stat-value">' +
      headcount +
      "</div></div>" +
      "</div>" +
      '<div class="fine">月薪合计 ' +
      payroll +
      " 万 · 6 个月工资预计 " +
      projected +
      " 万 · 实际启动预算 " +
      actualBudget +
      " 万</div>" +
      (overBudget
        ? '<div class="warning">6 个月工资超过实际预算。你需要在项目里少做动作、砍需求，或者接受预算透支。</div>'
        : "") +
      "</div>" +
      (remaining > 0
        ? decisionBanner("还需要选 " + remaining + " 个方向", "每个方向 3 选 1；选中即锁定负责人，方向不会空缺。")
        : nextBanner("团队已选齐", "确认下方团队，然后进入项目。")) +
      '<div class="section-title">每个方向选一个团队。选中即锁定负责人，方向不会空缺。</div>' +
      C.directions
        .map(function (d) {
          var teams = displayedTeams(d.id);
          var chosen = UI.selectedTeams[d.id];
          return (
            '<div class="direction-head"><div><div class="direction-name">' +
            esc(d.name) +
            '<span class="decision-tag ' +
            (chosen ? "done" : "pending") +
            '">' +
            (chosen ? "已锁定" : "待选") +
            '</span></div><div class="direction-hint">' +
            esc(d.hint) +
            "</div></div></div>" +
            '<div class="candidate-list">' +
            teams.map(teamCard).join("") +
            "</div>"
          );
        })
        .join("") +
      '<div class="sticky-bottom">' +
      '<div class="hint">' +
      (remaining > 0 ? '<span class="decision-tag pending">还差 ' + remaining + " 个方向</span> " : "") +
      "已选方向 " +
      dirCount +
      "/" +
      C.directions.length +
      " · 团队 " +
      headcount +
      " 人 · 月薪 " +
      payroll +
      " 万" +
      (overBudget ? ' · <span class="danger-text">工资超预算</span>' : "") +
      "</div>" +
      '<button class="btn primary block ' +
      (dirCount === C.directions.length ? "attention" : "") +
      '" data-act="start-game" ' +
      (dirCount !== C.directions.length ? "disabled" : "") +
      ">带团队进项目（" +
      headcount +
      " 人）</button>" +
      "</div>" +
      "</div>"
    );
  }

  function showTeamDetail(teamId) {
    var team = teamById(teamId);
    if (!team) return;
    var checked = Object.prototype.hasOwnProperty.call(UI.checkedTeams, team.id);
    var clue = checked ? team.clues[UI.checkedTeams[team.id]] : "";
    showModal(
      '<div class="sheet-handle"></div>' +
        '<div class="sheet-head">' +
        '<div><div class="h2">' +
        esc(team.name) +
        '</div><div class="body">' +
        esc(directionName(team.direction)) +
        " · " +
        team.headcount +
        " 人 · 月薪 " +
        team.salary +
        " 万 · 平均 " +
        team.avgYears +
        " 年</div></div>" +
        '<button class="btn ghost small" data-act="close-modal">关闭</button>' +
        "</div>" +
        '<p class="pitch">' +
        esc(team.desc) +
        "</p>" +
        '<div class="fine">资历结构：' +
        esc(mixLabel(team)) +
        "</div>" +
        '<div class="fine">负责人：' +
        esc(team.lead) +
        "。 " +
        esc(team.leadBio || "") +
        "</div>" +
        '<div class="tags">' +
        team.tags
          .map(function (t) {
            return '<span class="tag">' + esc(t) + "</span>";
          })
          .join("") +
        "</div>" +
        (clue ? '<div class="clue">背调线索：' + esc(clue) + "</div>" : "") +
        '<p class="fine">以上都是描述。真实战力、质量、速度、协作、稳定性和隐藏风险不可见。</p>'
    );
  }

  function gateCards() {
    var g = UI.game && UI.game.lastGates;
    return (
      '<div class="gate-grid">' +
      '<div class="gate-card"><div class="mini-title">规格 gate</div><div class="gate-value">' +
      (g ? esc(g.specLabel) : "未开始") +
      '</div><div class="fine">架构 + 算法共同负责</div></div>' +
      '<div class="gate-card"><div class="mini-title">Signoff gate</div><div class="gate-value">' +
      (g ? esc(g.signoffLabel) : "未开始") +
      '</div><div class="fine">后端 + 中端 + 验证收敛度</div></div>' +
      "</div>"
    );
  }

  function teamGameCard(d) {
    var team = UI.game.teams[d.id];
    var last = UI.game.lastTeamReports[d.id];
    var shown = last ? last.progress : 0;
    var status = last ? last.status : "未开始";
    var quote = last ? last.quote : "还没有月报。";
    var speaker = last ? last.speaker : team.content.lead;
    return (
      '<div class="track-card team-game-card">' +
      '<div class="track-head">' +
      "<div><div class=\"track-name\">" +
      esc(team.content.name) +
      '</div><div class="track-goal">' +
      esc(d.name) +
      " · " +
      team.content.headcount +
      " 人 · 月薪 " +
      team.content.salary +
      " 万 · 平均 " +
      team.content.avgYears +
      " 年</div></div>" +
      '<span class="badge">' +
      esc(status) +
      "</span>" +
      "</div>" +
      '<div class="progress"><div class="progress-fill" style="width:' +
      Math.round(shown) +
      '%"></div></div>' +
      (last
        ? '<div class="quote"><span class="quote-speaker">' +
          esc(speaker) +
          "：</span>“" +
          esc(quote) +
          "”</div>"
        : "") +
      (last && last.details
        ? last.details
            .map(function (x) {
              return '<div class="detail">' + esc(x) + "</div>";
            })
            .join("")
        : "") +
      (last && last.dep ? '<div class="warning">' + esc(last.dep) + "</div>" : "") +
      '<div class="fine">' +
      (last && last.audit ? "已审计 · " : "") +
      (last ? "上期自报" : "尚未月报") +
      "</div>" +
      '<button class="btn ghost small" style="margin-top:8px" data-act="team-detail" data-id="' +
      team.content.id +
      '">团队详情</button>' +
      "</div>"
    );
  }

  function renderGame() {
    var s = UI.game;
    var p = currentProject();
    var active = activeDirections();
    return (
      '<div class="wrap game-screen">' +
      topbar() +
      budgetCrisisNotice(s) +
      (s.actionUsed
        ? nextBanner("本月决策已完成", decisionSummary(s))
        : decisionBanner("本月管理动作还没选", "进入本月决策页，先选动作，再选进一步选项。")) +
      '<div class="month-card">' +
      '<div class="row between">' +
      '<div><div class="kicker">M' +
      s.month +
      " / 6</div><div class=\"h2\">" +
      esc(
        s.month === 1
          ? "规格、架构、算法"
          : s.month === 2
          ? "RTL 与验证启动"
          : s.month === 3
          ? "RTL 0.75，中端进场"
          : s.month === 4
          ? "RTL 0.9，后端进场"
          : s.month === 5
          ? "RTL freeze"
          : "后端迭代与 signoff"
      ) +
      "</div></div>" +
      '<button class="btn ghost small" data-act="glossary">术语</button>' +
      "</div>" +
      '<p class="body">' +
      esc(p.stageHints[s.month - 1]) +
      "</p>" +
      '<div class="fine">月薪支出 ' +
      E.totalSalary(s) +
      " 万 · 预算结余 " +
      Math.round(s.budget) +
      " 万</div>" +
      gateCards() +
      "</div>" +
      decisionEntry(s) +
      '<div class="section-title">方向团队</div>' +
      '<div class="track-list">' +
      active
        .map(function (d) {
          return teamGameCard(d);
        })
        .join("") +
      "</div>" +
      (function () {
        var inactive = C.directions.filter(function (d) {
          return d.active.indexOf(s.month) < 0;
        });
        if (!inactive.length) return "";
        return (
          '<div class="section-title">其他方向</div>' +
          '<div class="card"><div class="fine">' +
          inactive
            .map(function (d) {
              var team = s.teams[d.id];
              var done = d.active[d.active.length - 1] < s.month;
              return esc(d.name) + " · " + esc(team.content.name) + " · " + (done ? "已收尾" : "M" + d.active[0] + " 进场");
            })
            .join("<br>") +
          "</div></div>"
        );
      })() +
      '<div class="sticky-bottom">' +
      (s.actionUsed
        ? ""
        : '<div class="hint center danger-text" style="margin-bottom:8px">本月决策未做</div>') +
      '<button class="btn primary block ' +
      (s.actionUsed ? "attention" : "") +
      '" data-act="start-month" ' +
      (s.actionUsed ? "" : "disabled") +
      ">" +
      (s.actionUsed ? "推进到 M" + s.month + " 月报" : "请先完成本月决策") +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function renderDecisionPanel(s) {
    if (s.actionUsed) {
      var result = s.lastAction && s.lastAction.result;
      var resultName = result ? result.action : s.lastAction ? s.lastAction.name : "已完成";
      var resultTarget = result && result.targetName ? " · " + result.targetName : "";
      return (
        '<div class="card decision-done">' +
        '<div class="row between"><div><div class="kicker">DECISION RESULT</div><div class="h2">' +
        esc(resultName + resultTarget) +
        '</div></div><span class="decision-tag done">已完成</span></div>' +
        effectChips(result) +
        (result && result.note ? '<div class="warning">' + esc(result.note) + "</div>" : "") +
        '<p class="fine">本月决策已完成，返回看板后推进到月报。</p>' +
        "</div>"
      );
    }

    var active = E.getActiveDirections(s);
    var selectedAction = UI.decisionAction;

    function actionRow(a) {
      var noDv = a.id === "verify" && !active.some(function (d) { return d.id === "dv"; });
      var disabled = s.budget < a.cost || (a.once && s.flags["used_" + a.id]) || noDv;
      return (
        '<button class="decision-option ' +
        (selectedAction === a.id ? "selected" : "") +
        '" data-act="pick-action" data-id="' +
        a.id +
        '" ' +
        (disabled ? "disabled" : "") +
        '>' +
        '<div><div class="action-name">' +
        esc(a.name) +
        (a.id === "skip" ? ' <span class="decision-tag pending">兜底</span>' : "") +
        '</div><div class="action-meta">' +
        esc(a.desc) +
        "</div></div>" +
        '<span class="decision-option-cost">' +
        (a.costLabel || (a.cost ? a.cost + " 万" : "0 万")) +
        "</span></button>"
      );
    }

    function directionChip(d) {
      var selected = UI.decisionDirection === d.id;
      var tags = s.teams[d.id].content.tags.filter(function (tag) {
        return ["不加班", "不服管", "跳槽风险", "能加班"].indexOf(tag) >= 0;
      });
      var ageHint =
        UI.decisionAction === "paint"
          ? " · 平均 " + s.teams[d.id].content.avgYears + " 年"
          : "";
      return (
        '<button class="direction-chip ' +
        (selected ? "selected" : "") +
        '" data-act="pick-direction" data-direction="' +
        d.id +
        '"><span class="check-box"></span><span><span class="chip-main">' +
        esc(d.name) +
        '</span><span class="chip-sub">' +
        esc(s.teams[d.id].content.name) +
        ageHint +
        (tags.length ? " · " + esc(tags.join(" / ")) : "") +
        "</span></span></button>"
      );
    }

    function secondaryFor(a) {
      if (a.needsTarget) {
        var selected = UI.decisionDirection;
        var targetHint =
          a.id === "paint" ? "（平均 3 年以内 +10，4–5 年 +3，6 年以上 -3）" : "";
        return (
          '<div class="decision-subpanel">' +
          '<div class="decision-subhead">已选动作：' +
          esc(a.name) +
          targetHint +
          "。再选择方向，然后执行。</div>" +
          '<div class="direction-picker">' +
          active.map(directionChip).join("") +
          "</div>" +
          '<button class="btn primary block" style="margin-top:10px" data-act="inline-action" data-id="' +
          a.id +
          '" data-direction="' +
          (selected || "") +
          '" ' +
          (selected ? "" : "disabled") +
          ">执行</button>" +
          '<button class="btn ghost small" style="margin-top:8px" data-act="clear-action">换个动作</button>' +
          "</div>"
        );
      }
      if (a.id === "verify") {
        var dv = s.teams.dv;
        var dvTags = dv.content.tags.filter(function (tag) {
          return ["不加班", "不服管", "跳槽风险", "能加班"].indexOf(tag) >= 0;
        });
        return (
          '<div class="decision-subpanel"><div class="decision-subhead">已选动作：加验证。验证团队：' +
          esc(dv.content.name) +
          (dvTags.length ? " · " + esc(dvTags.join(" / ")) : "") +
          '</div><p class="fine">验证进度 +10，bug -8（受团队 trait 影响）。</p>' +
          '<button class="btn primary block" data-act="inline-action" data-id="verify">执行</button>' +
          '<button class="btn ghost small" style="margin-top:8px" data-act="clear-action">换个动作</button></div>'
        );
      }
      return (
        '<div class="decision-subpanel"><div class="decision-subhead">已选动作：' +
        esc(a.name) +
        '</div><p class="fine">' +
        esc(a.desc) +
        "</p>" +
        '<button class="btn primary block" data-act="inline-action" data-id="' +
        a.id +
        '">' +
        (a.id === "skip" ? "确认跳过" : "执行") +
        "</button>" +
        '<button class="btn ghost small" style="margin-top:8px" data-act="clear-action">换个动作</button></div>'
      );
    }

    var actionList = E.ACTIONS.map(function (a) {
      return actionRow(a) + (selectedAction === a.id ? secondaryFor(a) : "");
    }).join("");

    return (
      '<div class="card decision-panel attention">' +
      '<div class="row between"><div><div class="mini-title">本月决策</div><div class="body">先选动作，再选这个动作下的方向或确认；不想花钱可以选“什么都不做”。</div></div><span class="decision-tag pending">未完成</span></div>' +
      '<div class="decision-list">' +
      actionList +
      "</div>" +
      (!selectedAction ? '<div class="decision-hint">先选一个动作，下面才会出现进一步选择。</div>' : "") +
      "</div>"
    );
  }

  function decisionEntry(s) {
    if (s.actionUsed) {
      var result = s.lastAction && s.lastAction.result;
      var resultName = result ? result.action : s.lastAction ? s.lastAction.name : "已完成";
      var resultTarget = result && result.targetName ? " · " + result.targetName : "";
      return (
        '<div class="card decision-entry"><div class="row between"><div><div class="kicker">DECISION RESULT</div><div class="h2">' +
        esc(resultName + resultTarget) +
        '</div></div><span class="decision-tag done">已完成</span></div>' +
        effectChips(result) +
        (result && result.note ? '<div class="warning">' + esc(result.note) + "</div>" : "") +
        "</div>"
      );
    }
    return (
      '<div class="card decision-entry attention"><div class="row between"><div><div class="mini-title">本月决策</div><div class="body">先选动作，再选动作下的方向或确认；全局里可以什么都不做。</div></div>' +
      '<button class="btn primary small attention" data-act="open-decision">进入本月决策</button></div></div>'
    );
  }

  function renderDecisionPage() {
    var s = UI.game;
    if (!s) return "";
    return (
      '<div class="wrap decision-screen">' +
      topbar() +
      budgetCrisisNotice(s) +
      '<div class="row between" style="margin-bottom:14px"><div><div class="kicker">M' +
      s.month +
      ' / 决策</div><div class="h2">本月动作</div></div>' +
      '<button class="btn ghost small" data-act="back-to-game">返回看板</button></div>' +
      (s.actionUsed
        ? nextBanner("决策已完成", "返回看板，推进到 M" + s.month + " 月报。")
        : decisionBanner("先选动作，再选进一步选项", "全局里可以什么都不做；选完才能推进。")) +
      renderDecisionPanel(s) +
      '<button class="btn ' +
      (s.actionUsed ? "primary" : "ghost") +
      ' block" style="margin-top:14px" data-act="back-to-game">' +
      (s.actionUsed ? "返回项目看板，推进月报" : "返回项目看板（未决策）") +
      "</button>" +
      "</div>"
    );
  }

  function applyAction(actionId, direction) {
    var r = E.chooseAction(UI.game, actionId, direction || null);
    if (!r.ok) {
      toast(r.message);
      return;
    }
    hideModal();
    UI.forceScrollTop = true;
    render();
  }

  function showGlossary() {
    var terms = [
      ["RTL", "寄存器传输级。写芯片逻辑的代码，也是后端和验证的输入。"],
      ["DV", "Design Verification，验证。负责证明设计没有 bug。"],
      ["DFT", "可测试性设计。让流片后的芯片能被测试机测到。"],
      ["ECO", "工程变更单。流片前后修 bug 的补丁。"],
      ["Signoff", "流片前最后一轮检查：时序、功耗、DRC、LVS 等。"],
      ["Waive", "签字放行。修不动的问题，只能带着风险流片。"],
      ["Tapeout", "流片。把设计送去代工厂制造。"],
      ["DRC / LVS", "版图规则检查和版图与电路一致性检查。"],
      ["MPW", "多项目晶圆。和小伙伴拼一炉流片，省钱但排期紧。"]
    ];
    showModal(
      '<div class="sheet-handle"></div>' +
        '<div class="sheet-head">' +
        '<div><div class="h2">术语小抄</div><div class="body">不懂芯片也能玩，但懂一点会更容易识破月报。</div></div>' +
        '<button class="btn ghost small" data-act="close-modal">关闭</button>' +
        "</div>" +
        terms
          .map(function (t) {
            return (
              '<div style="padding:10px 0;border-top:1px solid var(--line)"><div style="font-weight:700">' +
              esc(t[0]) +
              '</div><div class="fine" style="margin-top:2px">' +
              esc(t[1]) +
              "</div></div>"
            );
          })
          .join("")
    );
  }

  function renderReportTeam(t) {
    return (
      '<div class="card report-track">' +
      '<div class="row between">' +
      '<div class="mini-title">' +
      esc(directionName(t.direction)) +
      " · " +
      esc(t.name) +
      "</div>" +
      '<span class="badge">' +
      esc(t.status) +
      (t.audit ? " · 已审计" : "") +
      "</span>" +
      "</div>" +
      '<div class="quote"><span class="quote-speaker">' +
      esc(t.speaker) +
      "：</span>“" +
      esc(t.quote) +
      "”</div>" +
      '<div class="progress"><div class="progress-fill" style="width:' +
      Math.round(t.progress) +
      '%"></div></div>' +
      (t.details || [])
        .map(function (d) {
          return '<div class="detail">' + esc(d) + "</div>";
        })
        .join("") +
      (t.dep ? '<div class="warning">' + esc(t.dep) + "</div>" : "") +
      '<div class="fine">' +
      esc(t.teamInfo) +
      (t.audit && t.trueProgress != null ? " · 审计真实进度 " + Math.round(t.trueProgress) + "%" : "") +
      "</div>" +
      "</div>"
    );
  }

  function renderEvent(e) {
    if (e.resolved) {
      return (
        '<div class="card event-card">' +
        '<div class="mini-title">' +
        esc(e.title) +
        "</div>" +
        '<p class="body">' +
        esc(e.text) +
        "</p>" +
        '<div class="result">你选择：' +
        esc(e.chosen) +
        "。" +
        esc(e.resultText) +
        "</div>" +
        "</div>"
      );
    }
    return (
      '<div class="card event-card needs-decision">' +
      '<div class="row between"><div class="mini-title">' +
      esc(e.title) +
      '</div><span class="decision-tag pending">需要选择</span></div>' +
      '<p class="body">' +
      esc(e.text) +
      "</p>" +
      '<div class="event-options">' +
      e.options
        .map(function (o, i) {
          return (
            '<button class="btn secondary block" data-act="event-option" data-id="' +
            e.id +
            '" data-index="' +
            i +
            '">' +
            esc(o.label) +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      "</div>"
    );
  }

  function renderReport() {
    var s = UI.game;
    var r = UI.report;
    if (!s || !r) return "";
    var resolved = E.allEventsResolved(s);
    var unresolved = (r.events || []).filter(function (e) {
      return !e.resolved;
    }).length;
    return (
      '<div class="wrap report-screen">' +
      topbar() +
      budgetCrisisNotice(s) +
      (unresolved
        ? decisionBanner("处理本月突发事件", "还剩 " + unresolved + " 件未选择，处理完才能进入下月。")
        : nextBanner("本月决策已完成", "确认月报后进入下月。")) +
      '<div class="month-card">' +
      '<div class="kicker">M' +
      r.month +
      " 月报</div>" +
      '<div class="h2">' +
      (r.month === 6 ? "最后一个整月" : "项目月报") +
      "</div>" +
      '<p class="body">工资支出 ' +
      r.salary +
      " 万，当前预算 " +
      Math.round(s.budget) +
      " 万。</p>" +
      (r.notes || [])
        .map(function (n) {
          return '<div class="warning">' + esc(n) + "</div>";
        })
        .join("") +
      '<div class="gate-grid">' +
      '<div class="gate-card"><div class="mini-title">规格 gate</div><div class="gate-value">' +
      esc(r.gates.specLabel) +
      "</div></div>" +
      '<div class="gate-card"><div class="mini-title">Signoff gate</div><div class="gate-value">' +
      esc(r.gates.signoffLabel) +
      "</div></div>" +
      "</div>" +
      '<div class="milestone-list">' +
      (r.milestones || [])
        .map(function (m) {
          return (
            '<div class="milestone"><span class="milestone-dot ' +
            (m.ok ? "" : "bad") +
            '"></span><span>' +
            esc(m.text) +
            "</span></div>"
          );
        })
        .join("") +
      "</div>" +
      "</div>" +
      '<div class="section-title">方向团队汇报</div>' +
      (r.directions || []).map(renderReportTeam).join("") +
      (r.events && r.events.length
        ? '<div class="section-title">本月突发（' + r.events.length + "）</div>" + r.events.map(renderEvent).join("")
        : "") +
      '<div class="sticky-bottom">' +
      (resolved
        ? '<button class="btn primary block attention" data-act="advance">' +
          (r.month === 6 ? "进入 Signoff" : "进入 M" + (r.month + 1)) +
          "</button>"
        : '<div class="hint center">先处理完突发事件，再进入下月。</div>') +
      "</div>" +
      "</div>"
    );
  }

  function waiverCard(w) {
    var s = UI.game;
    var canFix = !w.fixed;
    return (
      '<div class="card waiver-card ' +
      (w.fixed ? "fixed" : w.waived ? "waived" : "needs-decision") +
      '">' +
      '<div class="row between">' +
      '<div class="mini-title">' +
      esc(w.category) +
      "</div>" +
      (w.fixed
        ? '<span class="badge ok">已修复</span>'
        : w.waived
        ? '<span class="badge bad">Waive</span>'
        : '<span class="decision-tag pending">待决定</span>') +
      "</div>" +
      '<p class="body" style="font-weight:700">' +
      esc(w.label) +
      "</p>" +
      '<p class="fine">' +
      esc(w.hint) +
      "</p>" +
      '<div class="row between" style="margin-top:10px">' +
      '<div class="fine" style="margin:0">修复：' +
      w.fixCost +
      " 万 / " +
      w.fixWeeks +
      " 周</div>" +
      '<div class="btn-group">' +
      '<button class="btn small ' +
      (w.fixed ? "primary" : "secondary") +
      '" data-act="waiver-fix" data-id="' +
      w.id +
      '" ' +
      (canFix || w.fixed ? "" : "disabled") +
      ">" +
      (w.fixed ? "已修复" : s.budget < w.fixCost ? "修复（透支）" : "修复") +
      "</button>" +
      '<button class="btn small ' +
      (w.waived ? "danger" : "secondary") +
      '" data-act="waiver-waive" data-id="' +
      w.id +
      '">Waive</button>' +
      "</div>" +
      "</div>" +
      (s.budget < w.fixCost && !w.fixed ? '<div class="warning">预算不足，修复会透支预算。</div>' : "") +
      "</div>"
    );
  }

  function renderWaiver() {
    var s = UI.game;
    if (!s) return "";
    var fixCost = s.waivers.reduce(function (sum, w) {
      return sum + (w.fixed ? w.fixCost : 0);
    }, 0);
    var decided = s.waivers.filter(function (w) {
      return w.fixed || w.waived;
    }).length;
    var undecided = s.waivers.length - decided;
    var fixedCount = s.waivers.filter(function (w) {
      return w.fixed;
    }).length;
    return (
      '<div class="wrap waiver-screen">' +
      topbar() +
      budgetCrisisNotice(s) +
      (undecided > 0
        ? decisionBanner("逐项决定修复或 Waive", "修得越多，预算、窗口和新增的集成/ECO 失败风险越大。")
        : nextBanner("所有项已决定", "确认流片，进入最终评估。")) +
      '<div class="month-card">' +
      '<div class="kicker">M6 / SIGNOFF</div>' +
      '<div class="h2">流片前最后一张表</div>' +
      '<p class="body">可以修多项，但每修一项都要花预算、顺延窗口，并引入额外的集成/ECO 失败风险。修得越多，流片越晚，风险越高；预算不足也可以修，但会透支，成本评分和失败风险都会变差。</p>' +
      '<div class="stats-row" style="grid-template-columns:repeat(4,1fr)">' +
      '<div class="stat"><div class="stat-label">预算</div><div class="stat-value">' +
      Math.round(s.budget) +
      " 万</div></div>" +
      '<div class="stat"><div class="stat-label">修复花费</div><div class="stat-value">' +
      fixCost +
      " 万</div></div>" +
      '<div class="stat"><div class="stat-label">预计延迟</div><div class="stat-value">' +
      s.delayWeeks +
      " 周</div></div>" +
      '<div class="stat"><div class="stat-label">已修复</div><div class="stat-value">' +
      fixedCount +
      " 项</div></div>" +
      "</div>" +
      (s.delayWeeks > 0
        ? '<div class="warning">流片窗口顺延 ' +
          s.delayWeeks +
          " 周。超过 4 周，市场窗口可能保不住。</div>"
        : "") +
      '<div class="row between" style="margin-top:12px">' +
      '<div class="fine" style="margin:0">已决定 ' +
      decided +
      " / " +
      s.waivers.length +
      " 项 · 已修复 " +
      fixedCount +
      " 项</div>" +
      '<button class="btn ghost small" data-act="waive-all">' +
      (UI.confirmWaiveAll ? "再点一次确认全部 Waive" : "全部 Waive") +
      "</button>" +
      "</div>" +
      "</div>" +
      '<div class="section-title">Signoff 违规项</div>' +
      s.waivers.map(waiverCard).join("") +
      '<div class="sticky-bottom">' +
      (UI.confirmSubmit
        ? '<div class="hint center" style="margin-bottom:8px">未决定项将默认 Waive</div>'
        : "") +
      '<button class="btn primary block ' +
      (undecided === 0 || UI.confirmSubmit ? "attention" : "") +
      '" data-act="submit-waivers">' +
      (UI.confirmSubmit ? "再点一次确认流片" : "确认流片") +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function worksLabel(e) {
    if (e.works) return "点亮";
    return e.condition === "partial" ? "部分无响应" : "不亮";
  }

  function functionLabel(e) {
    if (e.works) return "点亮";
    return e.condition === "partial" ? "部分" : "失败";
  }

  function severeLabel(e) {
    if (e.severe === "none") return "无";
    if (e.severe === "minor") return "少量 errata";
    if (e.severe === "major") return "严重 errata";
    return "致命";
  }

  function truthTeamCard(t) {
    return (
      '<div class="card truth-team">' +
      '<div class="row between">' +
      '<div class="name">' +
      esc(t.name) +
      "</div>" +
      '<span class="badge">' +
      esc(t.directionName) +
      "</span>" +
      "</div>" +
      '<div class="fine">' +
      t.headcount +
      " 人 · 月薪 " +
      t.salary +
      " 万 · 平均 " +
      t.avgYears +
      " 年 · " +
      esc(levelsLabel(t.levels)) +
      "</div>" +
      '<div class="truth-grid">' +
      '<div class="truth-stat">真实战力<b>' +
      t.hidden.skill +
      "</b></div>" +
      '<div class="truth-stat">质量<b>' +
      t.hidden.quality +
      "</b></div>" +
      '<div class="truth-stat">速度<b>' +
      t.hidden.speed +
      "</b></div>" +
      '<div class="truth-stat">协作<b>' +
      t.hidden.collab +
      "</b></div>" +
      '<div class="truth-stat">稳定<b>' +
      t.hidden.stability +
      "</b></div>" +
      '<div class="truth-stat">偏差<b>' +
      (t.hidden.bias > 0 ? "+" : "") +
      t.hidden.bias +
      "</b></div>" +
      "</div>" +
      '<div class="fine">隐藏标签：' +
      esc(t.hidden.traits.join("、") || "无") +
      " · 项目 fit " +
      t.fit +
      "</div>" +
      "</div>"
    );
  }

  function riskClass(r) {
    if (r >= 0.6) return "risk-high";
    if (r >= 0.4) return "risk-mid";
    return "risk-low";
  }

  function budgetResultCard(e) {
    if (!e.overspendPct || e.overspendPct <= 0) return "";
    var title = e.cashCrash ? "资金链断裂" : "预算超支";
    var canWait = e.works && e.severe !== "fatal";
    var lines = [];
    if (e.cashCrash) {
      lines.push(
        "等待量产期间资金链断裂：超支 " +
          e.overspendPct +
          "%，触发概率 " +
          Math.round((e.pCashCrash || 0) * 100) +
          "%，实际触发。"
      );
      lines.push("评级 D，总分封顶 49。");
    } else if (e.overspendPct > 20 && canWait) {
      lines.push(
        "超支 " +
          e.overspendPct +
          "%，等待量产未触发资金链断裂（概率 " +
          Math.round((e.pCashCrash || 0) * 100) +
          "%）。"
      );
      lines.push("评级已降 1 级，最终 " + e.grade + "。");
    } else if (e.overspendPct > 20) {
      lines.push("超支 " + e.overspendPct + "%，本次未进入量产等待阶段，未做资金链断裂判定。");
      lines.push("评级已降 1 级，最终 " + e.grade + "。");
    } else {
      lines.push("超支 " + e.overspendPct + "%，未进入资金链断裂判定。");
      lines.push("评级已降 1 级，最终 " + e.grade + "。");
    }
    return (
      '<div class="card budget-result' +
      (e.cashCrash ? " danger" : "") +
      '"><div class="mini-title">' +
      title +
      '</div><p class="body">' +
      esc(lines.join(" ")) +
      '</p><div class="fine">现有超支惩罚已同时作用于点亮、严重 errata 和量产概率。</div></div>'
    );
  }

  function renderResult() {
    var s = UI.game;
    if (!s || !s.evaluation) return "";
    var e = s.evaluation;
    var truth = E.getTruth(s);
    var teamNames = truth.teams.map(function (t) {
      return t.name;
    }).join("、");
    return (
      '<div class="wrap result-screen">' +
      nextBanner("本局结束", "先看真相复盘，再保存分享卡或再来一局。") +
      '<div class="result-hero grade-' +
      e.grade +
      '">' +
      '<div class="kicker">TAPEOUT RESULT</div>' +
      '<div class="grade">' +
      e.grade +
      "</div>" +
      '<div class="ending-title">' +
      esc(e.ending.title) +
      "</div>" +
      '<div class="ending-sub">' +
      esc(e.ending.subtitle) +
      "</div>" +
      '<div class="score">' +
      e.score +
      " / 100 · 项目名 " +
      esc(s.seed) +
      "</div>" +
      '<p class="ending-body">' +
      esc(e.ending.body) +
      "</p>" +
      "</div>" +
      '<div class="check-grid">' +
      '<div class="check ' +
      (e.works ? "ok" : "bad") +
      '"><div class="check-label">BRING-UP</div><div class="check-value">' +
      worksLabel(e) +
      "</div></div>" +
      '<div class="check ' +
      (e.severe === "none" ? "ok" : "bad") +
      '"><div class="check-label">ERRATA</div><div class="check-value">' +
      severeLabel(e) +
      "</div></div>" +
      '<div class="check ' +
      (e.mp ? "ok" : "bad") +
      '"><div class="check-label">量产</div><div class="check-value">' +
      (e.cashCrash ? "资金链断裂" : e.mp ? "可量产" : "不可量产") +
      "</div></div>" +
      "</div>" +
      budgetResultCard(e) +
      '<div class="metric-grid">' +
      '<div class="metric"><div class="metric-label">功能</div><div class="metric-value">' +
      functionLabel(e) +
      " · 覆盖 " +
      e.coverage +
      '%</div></div>' +
      '<div class="metric"><div class="metric-label">市场</div><div class="metric-value">' +
      e.market +
      " / 100</div></div>" +
      '<div class="metric"><div class="metric-label">成本</div><div class="metric-value ' +
      (e.budgetRemaining < 0 ? "danger-text" : "") +
      '">结余 ' +
      Math.round(e.budgetRemaining) +
      " 万</div></div>" +
      '<div class="metric"><div class="metric-label">Tapeout</div><div class="metric-value">' +
      (e.onTime ? "准时" : "延迟 " + e.delayWeeks + " 周") +
      "</div></div>" +
      "</div>" +
      (function () {
        var fixedList = e.fixed || [];
        var topWaived = e.waived.slice().sort(function (a, b) {
          return b.trueRisk - a.trueRisk;
        })[0];
        var choice = fixedList.length
          ? "你修复了 " +
            fixedList.length +
            " 项（花费 " +
            Math.round(e.fixCost || 0) +
            " 万，窗口顺延 " +
            e.delayWeeks +
            " 周）：" +
            fixedList
              .map(function (w) {
                return "「" + w.label + "」";
              })
              .join("、") +
            "。修复本身新增 " +
            Math.round((e.fixRisk || 0) * 100) +
            "% 的 ECO/集成风险。"
          : "你没有修复，全部 Waive。";
        if (topWaived) {
          choice += "「" + topWaived.label + "」被 Waive（真实风险 " + Math.round(topWaived.trueRisk * 100) + "%）。";
        }
        choice += "这次流片的 Bring-up / Errata / 量产结果直接受这个选择影响。";
        return '<div class="card signoff-choice"><div class="mini-title">关键 Signoff 取舍</div><p class="body">' + esc(choice) + "</p></div>";
      })() +
      '<div class="section-title">真相复盘 · 团队</div>' +
      truth.teams.map(truthTeamCard).join("") +
      '<div class="card">' +
      '<div class="mini-title">Waive 的真实风险</div>' +
      '<div style="margin-top:8px">' +
      truth.waivers
        .map(function (w) {
          return (
            '<div class="row between" style="padding:7px 0;border-bottom:1px solid rgba(42,53,68,.55)">' +
            '<div class="fine" style="margin:0;max-width:74%">' +
            esc(w.label) +
            " · " +
            (w.fixed ? "已修复" : "已 Waive") +
            "</div>" +
            '<div class="' +
            riskClass(w.trueRisk) +
            '" style="font-size:12px;font-weight:700">' +
            Math.round(w.trueRisk * 100) +
            "%</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="mini-title" style="margin-top:16px">项目隐藏需求</div>' +
      '<p class="body">' +
      esc(truth.project.hidden) +
      "</p>" +
      '<div class="mini-title" style="margin-top:16px">关键日志</div>' +
      '<ul class="log">' +
      truth.log
        .slice(-12)
        .map(function (l) {
          return "<li>" + esc(l) + "</li>";
        })
        .join("") +
      "</ul>" +
      "</div>" +
      '<button class="btn primary block" data-act="share-image">生成分享卡 / 保存 / 发布</button>' +
      '<div style="height:8px"></div>' +
      '<button class="btn ghost block" data-act="restart">再来一局</button>' +
      '<p class="fine center" style="margin-top:14px">团队：' +
      esc(teamNames) +
      " · 项目名 " +
      esc(s.seed) +
      "</p>" +
      "</div>"
    );
  }

  function render() {
    var scrollY = window.scrollY;
    var forceTop = UI.forceScrollTop;
    UI.forceScrollTop = false;
    var same = UI.lastRenderScreen === UI.screen;
    UI.lastRenderScreen = UI.screen;
    var html = "";
    if (UI.screen === "title") html = renderTitle();
    else if (UI.screen === "team") html = renderTeamSelect();
    else if (UI.screen === "game") html = renderGame();
    else if (UI.screen === "decision") html = renderDecisionPage();
    else if (UI.screen === "report") html = renderReport();
    else if (UI.screen === "waiver") html = renderWaiver();
    else if (UI.screen === "result") html = renderResult();
    app.innerHTML = html;
    if (same && !forceTop) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
  }

  function shareTextContent() {
    var s = UI.game;
    var e = s.evaluation;
    return (
      "我在《流片吧，PM》里把一颗通信 SoC 送到流片。\n" +
      "结局：" +
      e.ending.title +
      "（" +
      e.grade +
      "），评分 " +
      e.score +
      "/100。\n" +
      "芯片：" +
      worksLabel(e) +
      "；Errata：" +
      severeLabel(e) +
      "；量产：" +
      (e.cashCrash ? "资金链断裂" : e.mp ? "可量产" : "不可量产") +
      "。\n" +
      "项目名：" +
      s.seed +
      "。6 个月，六个团队，一颗芯片。"
    );
  }

  function platformError(err) {
    return (err && (err.errMsg || err.message)) || "操作失败，请稍后重试";
  }

  function saveShareImage() {
    if (!UI.shareImageDataUrl) return;
    if (!global.MiniPlatform || !global.MiniPlatform.canSave()) {
      toast("当前环境不支持保存到相册");
      return;
    }
    toast("正在保存到相册...");
    global.MiniPlatform.saveImage(UI.shareImageDataUrl).then(
      function () {
        toast("已保存到相册");
      },
      function (err) {
        toast(platformError(err));
      }
    );
  }

  function postShareNote() {
    if (!UI.shareImageDataUrl) return;
    if (!global.MiniPlatform || !global.MiniPlatform.canPost()) {
      toast("当前环境不支持发布笔记");
      return;
    }
    var e = UI.game.evaluation;
    global.MiniPlatform.postNote(UI.shareImageDataUrl, {
      title: "流片吧，PM · " + e.ending.title,
      content: shareTextContent()
    }).then(
      function () {
        toast("已打开发布页，请确认后发布");
      },
      function (err) {
        toast(platformError(err));
      }
    );
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var chars = String(text).split("");
    var line = "";
    var lines = [];
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
        if (maxLines && lines.length >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line && (!maxLines || lines.length < maxLines)) lines.push(line);
    lines.forEach(function (l, idx) {
      ctx.fillText(l, x, y + idx * lineHeight);
    });
  }

  function shareImage() {
    var s = UI.game;
    var e = s.evaluation;
    var teamNames = C.directions
      .map(function (d) {
        return s.teams[d.id].content.name;
      })
      .join("、");
    var canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    var ctx = canvas.getContext("2d");
    var font = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

    ctx.fillStyle = "#f7f2e7";
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.fillStyle = "#fffdf9";
    roundRect(ctx, 56, 56, 968, 1328, 36);
    ctx.fill();
    ctx.strokeStyle = "#d9cebb";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#5c430f";
    ctx.font = "800 220px " + font;
    ctx.textAlign = "center";
    ctx.translate(540, 760);
    ctx.rotate(-0.32);
    ctx.fillText("一维空间", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#9a6a00";
    ctx.font = "700 26px " + font;
    ctx.fillText("TAPEOUT RESULT", 104, 142);

    ctx.fillStyle = "#6b7069";
    ctx.font = "400 26px " + font;
    ctx.fillText("流片吧，PM · 项目名 " + s.seed, 104, 186);

    ctx.fillStyle = e.grade === "D" ? "#bd3b32" : "#9a6a00";
    ctx.font = "800 170px " + font;
    ctx.textAlign = "right";
    ctx.fillText(e.grade, 960, 280);
    ctx.textAlign = "left";

    ctx.fillStyle = "#20262e";
    ctx.font = "800 82px " + font;
    wrapCanvasText(ctx, e.ending.title, 104, 330, 760, 92, 2);

    ctx.fillStyle = "#6b7069";
    ctx.font = "400 30px " + font;
    wrapCanvasText(ctx, e.ending.subtitle, 104, 500, 820, 42, 2);

    var checks = [
      ["BRING-UP", worksLabel(e), e.works],
      ["ERRATA", severeLabel(e), e.severe === "none"],
      ["量产", e.cashCrash ? "资金链断裂" : e.mp ? "可量产" : "不可量产", e.mp]
    ];
    checks.forEach(function (c, i) {
      var x = 104 + i * 296;
      ctx.fillStyle = "#f3ecdf";
      roundRect(ctx, x, 576, 264, 132, 18);
      ctx.fill();
      ctx.strokeStyle = c[2] ? "rgba(63,185,80,.45)" : "rgba(248,81,73,.45)";
      ctx.stroke();
      ctx.fillStyle = "#6b7069";
      ctx.font = "600 20px " + font;
      ctx.fillText(c[0], x + 22, 616);
      ctx.fillStyle = c[2] ? "#2e7d3e" : "#bd3b32";
      ctx.font = "700 30px " + font;
      ctx.fillText(c[1], x + 22, 668);
    });

    ctx.fillStyle = "#20262e";
    ctx.font = "700 34px " + font;
    ctx.fillText("功能 " + functionLabel(e) + "  ·  覆盖 " + e.coverage + "%", 104, 792);
    ctx.fillText(
      "市场 " +
        e.market +
        " / 100  ·  成本结余 " +
        Math.round(e.budgetRemaining) +
        " 万" +
        (e.overspendPct ? "  ·  超支 " + e.overspendPct + "%" : ""),
      104,
      846
    );
    ctx.fillText("Tapeout " + (e.onTime ? "准时" : "延迟 " + e.delayWeeks + " 周") + "  ·  得分 " + e.score, 104, 900);

    ctx.fillStyle = "#6b7069";
    ctx.font = "600 22px " + font;
    ctx.fillText("方向团队", 104, 980);
    ctx.fillStyle = "#20262e";
    ctx.font = "700 30px " + font;
    wrapCanvasText(ctx, teamNames, 104, 1026, 820, 42, 3);

    ctx.fillStyle = "#6b7069";
    ctx.font = "400 24px " + font;
    wrapCanvasText(ctx, "“" + e.ending.body + "”", 104, 1150, 840, 38, 4);

    ctx.fillStyle = "#9a6a00";
    ctx.font = "700 24px " + font;
    ctx.fillText("6 个月，六个团队，一颗芯片。", 104, 1330);

    var dataUrl = canvas.toDataURL("image/png");
    UI.shareImageDataUrl = dataUrl;
    var canSave = global.MiniPlatform && global.MiniPlatform.canSave();
    var canPost = global.MiniPlatform && global.MiniPlatform.canPost();
    showModal(
      '<div class="sheet-handle"></div>' +
        '<div class="sheet-head">' +
        '<div><div class="h2">分享卡</div><div class="body">保存到相册，或带上战绩发布小红书笔记。</div></div>' +
        '<button class="btn ghost small" data-act="close-modal">关闭</button>' +
        "</div>" +
        '<img src="' +
        dataUrl +
        '" alt="share card" style="width:100%;border-radius:14px;border:1px solid var(--line)">' +
        (canSave
          ? '<button class="btn primary block" style="margin-top:12px" data-act="save-share-image">保存到相册</button>'
          : "") +
        (canPost
          ? '<button class="btn secondary block" style="margin-top:8px" data-act="post-share-note">发布到小红书</button>'
          : "") +
        (!canSave && !canPost
          ? '<div class="warning">当前环境未注入小红书端能力，无法保存或发布；请在小红书 App 内打开。</div>'
          : "")
    );
  }

  function startGame() {
    var game = E.createRun({
      seed: UI.seed,
      projectId: UI.projectId,
      teamIds: selectedTeamIds(),
      backgroundCheckCost: UI.backgroundCost,
      backgroundChecks: Object.keys(UI.checkedTeams)
    });
    if (game.ok === false) {
      toast(game.message);
      return;
    }
    UI.game = game;
    UI.report = null;
    UI.decisionAction = null;
    UI.decisionDirection = null;
    UI.confirmWaiveAll = false;
    UI.confirmSubmit = false;
    UI.screen = "game";
    render();
  }

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    var id = el.getAttribute("data-id");
    var direction = el.getAttribute("data-direction");
    var index = el.getAttribute("data-index");

    if (act === "start") {
      var input = document.getElementById("seedInput");
      UI.seed = (input && input.value.trim()) || randomProjectName();
      UI.selectedTeams = {};
      UI.checkedTeams = {};
      UI.backgroundCost = 0;
      UI.decisionAction = null;
      UI.decisionDirection = null;
      UI.screen = "team";
      render();
    } else if (act === "back-title") {
      UI.screen = "title";
      render();
    } else if (act === "toggle-team") {
      var team = teamById(id);
      if (!team) return;
      if (UI.selectedTeams[team.direction] === team.id) {
        delete UI.selectedTeams[team.direction];
      } else if (!UI.selectedTeams[team.direction]) {
        UI.selectedTeams[team.direction] = team.id;
      }
      render();
    } else if (act === "background-team") {
      if (Object.prototype.hasOwnProperty.call(UI.checkedTeams, id)) {
        toast("这个团队已经背调过了。");
        return;
      }
      var team = teamById(id);
      if (!team) return;
      var clueRng = RNG.mulberry32(RNG.hashSeed(UI.seed + ":team:" + id));
      UI.checkedTeams[id] = Math.floor(clueRng() * team.clues.length);
      UI.backgroundCost += 15;
      render();
    } else if (act === "team-detail") {
      showTeamDetail(id);
    } else if (act === "start-game") {
      if (selectedDirectionCount() !== C.directions.length) {
        toast("先把 6 个方向选齐。");
        return;
      }
      startGame();
    } else if (act === "open-decision") {
      if (!UI.game) return;
      UI.screen = "decision";
      render();
    } else if (act === "back-to-game") {
      UI.screen = "game";
      render();
    } else if (act === "pick-action") {
      UI.decisionAction = UI.decisionAction === id ? null : id;
      UI.decisionDirection = null;
      render();
    } else if (act === "clear-action") {
      UI.decisionAction = null;
      UI.decisionDirection = null;
      render();
    } else if (act === "pick-direction") {
      UI.decisionDirection = UI.decisionDirection === direction ? null : direction;
      render();
    } else if (act === "inline-action") {
      var action = E.ACTIONS.find(function (a) {
        return a.id === id;
      });
      if (!action) return;
      var target = null;
      if (action.needsTarget) {
        target = direction || (UI.decisionDirection && UI.decisionDirection !== "global" ? UI.decisionDirection : "");
        if (!target || target === "global") {
          toast("请先勾选一个方向");
          return;
        }
      }
      applyAction(id, target);
    } else if (act === "start-month") {
      if (!UI.game) return;
      if (!UI.game.actionUsed) {
        toast("请先完成本月决策");
        return;
      }
      var report = E.resolveMonth(UI.game);
      if (report && report.ok === false) {
        toast(report.message);
        return;
      }
      UI.report = report;
      UI.decisionAction = null;
      UI.decisionDirection = null;
      UI.screen = "report";
      render();
    } else if (act === "event-option") {
      if (!UI.game) return;
      var res = E.resolveEvent(UI.game, id, parseInt(index, 10));
      if (!res.ok) {
        toast(res.message);
        return;
      }
      render();
    } else if (act === "advance") {
      if (!UI.game) return;
      var adv = E.advanceMonth(UI.game);
      if (!adv.ok) {
        toast(adv.message);
        return;
      }
      UI.decisionAction = null;
      UI.decisionDirection = null;
      UI.confirmWaiveAll = false;
      UI.confirmSubmit = false;
      if (adv.phase === "waiver") {
        UI.screen = "waiver";
      } else {
        UI.screen = "game";
      }
      render();
    } else if (act === "waiver-fix" || act === "waiver-waive") {
      if (!UI.game) return;
      UI.confirmWaiveAll = false;
      UI.confirmSubmit = false;
      var decision = act === "waiver-fix" ? "fix" : "waive";
      var wr = E.setWaiver(UI.game, id, decision);
      if (!wr.ok) {
        toast(wr.message);
        return;
      }
      render();
    } else if (act === "waive-all") {
      if (!UI.game) return;
      if (!UI.confirmWaiveAll) {
        UI.confirmWaiveAll = true;
        UI.confirmSubmit = false;
        render();
        return;
      }
      UI.game.waivers.forEach(function (w) {
        E.setWaiver(UI.game, w.id, "waive");
      });
      UI.confirmWaiveAll = false;
      render();
    } else if (act === "submit-waivers") {
      if (!UI.game) return;
      var undecided = UI.game.waivers.filter(function (w) {
        return !w.fixed && !w.waived;
      }).length;
      if (undecided > 0 && !UI.confirmSubmit) {
        UI.confirmSubmit = true;
        UI.confirmWaiveAll = false;
        render();
        return;
      }
      var ev = E.submitWaivers(UI.game);
      if (ev && ev.ok === false) {
        toast(ev.message);
        return;
      }
      UI.confirmSubmit = false;
      UI.screen = "result";
      render();
    } else if (act === "glossary") {
      showGlossary();
    } else if (act === "close-modal") {
      hideModal();
    } else if (act === "share-image") {
      shareImage();
    } else if (act === "save-share-image") {
      saveShareImage();
    } else if (act === "post-share-note") {
      postShareNote();
    } else if (act === "restart") {
      UI.screen = "title";
      UI.game = null;
      UI.report = null;
      UI.selectedTeams = {};
      UI.checkedTeams = {};
      UI.backgroundCost = 0;
      UI.shareImageDataUrl = null;
      UI.decisionAction = null;
      UI.decisionDirection = null;
      UI.seed = "";
      hideModal();
      render();
    }
  });

  modalRoot.addEventListener("click", function (ev) {
    if (ev.target.classList.contains("sheet-backdrop")) {
      hideModal();
    }
  });

  global.GameUI = {
    state: UI,
    render: render,
    showModal: showModal,
    hideModal: hideModal
  };

  render();
})(typeof window !== "undefined" ? window : globalThis);
