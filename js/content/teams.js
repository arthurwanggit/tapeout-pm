(function (global) {
  var GC = (global.GameContent = global.GameContent || {});

  GC.directions = [
    { id: "arch", name: "架构", active: [1, 2, 3], hint: "模块划分、接口和架构评审" },
    { id: "algo", name: "算法", active: [1, 2, 3], hint: "算法模型、定点化和性能" },
    { id: "rtl", name: "RTL", active: [2, 3, 4, 5], hint: "前端实现与迭代" },
    { id: "dv", name: "验证", active: [2, 3, 4, 5, 6], hint: "环境、覆盖率和 bug 收敛" },
    { id: "midend", name: "中端", active: [3, 4, 5, 6], hint: "综合、DFT、低功耗" },
    { id: "backend", name: "后端", active: [4, 5, 6], hint: "floorplan、时序、DRC/LVS" }
  ];

  GC.candidateTeams = [
    {
      id: "arch_wang",
      direction: "arch",
      name: "老王架构团队",
      lead: "老王",
      avgYears: 6,
      desc: "大厂架构团队，主导过三颗 SoC。最擅长把复杂问题讲简单，但 RTL 和验证细节别指望他们。团队不加班，也不太接受强管理。",
      leadBio: "老王，大厂架构师，PPT 和架构评审很强，细节靠团队。",
      tags: ["大厂背景", "能说会道", "高预算", "不加班", "不服管", "跳槽风险"],
      clues: [
        "他们确实主导过三颗 SoC，但两颗是别人收的尾。",
        "问到 RTL 细节时，老王说“那是下面人干的”。",
        "团队里真正画图的是两个中级工程师。"
      ],
      fit: 1.05,
      hidden: { skill: 82, quality: 68, speed: 55, collab: 55, stability: 60, bias: 18, traits: ["paper_tiger", "ego", "ppt_driven"] }
    },
    {
      id: "arch_xu",
      direction: "arch",
      name: "老许架构团队",
      lead: "老许",
      avgYears: 5,
      desc: "十年架构团队，接口定义很少返工，决策偏保守。到点下班。",
      leadBio: "老许，大厂十年架构，擅长模块划分和接口，决策慢。",
      tags: ["稳重", "保守", "文档全", "不加班"],
      clues: [
        "接口定义很少返工，但架构评审时很少拍板。",
        "愿意配合老王，但不愿意替老王背锅。",
        "关键决策会往后拖。"
      ],
      fit: 1.0,
      hidden: { skill: 72, quality: 78, speed: 50, collab: 70, stability: 78, bias: 5, traits: ["conservative", "document_heavy"] }
    },
    {
      id: "arch_outsource",
      direction: "arch",
      name: "外包架构团队",
      lead: "老周",
      avgYears: 2,
      desc: "便宜、人多，架构文档和 PPT 都能出，但没人真正拍板。",
      leadBio: "老周，外包架构负责人，交付文档很快，决策靠客户。",
      tags: ["外包", "便宜", "人多"],
      clues: [
        "PPT 很漂亮，但架构决策要客户拍板。",
        "外包团队流动率高，接口定义经常换人。",
        "报价便宜，改动要加钱。"
      ],
      fit: 0.95,
      hidden: { skill: 55, quality: 48, speed: 65, collab: 60, stability: 45, bias: 12, traits: ["outsourced", "paper_tiger", "high_turnover"] }
    },
    {
      id: "algo_xia",
      direction: "algo",
      name: "小夏算法团队",
      lead: "小夏",
      avgYears: 2,
      desc: "刚毕业的算法比赛团队，便宜、能推公式，但没做过量产芯片。便宜、能加班。",
      leadBio: "小夏，算法比赛金牌，理论强，量产经验少。",
      tags: ["新人", "算法强", "便宜", "能加班"],
      clues: [
        "算法比赛金牌，但没做过量产芯片。",
        "她愿意学，但需要有人带。",
        "对客户改需求没有概念。"
      ],
      fit: 1.1,
      hidden: { skill: 86, quality: 60, speed: 70, collab: 75, stability: 60, bias: -15, traits: ["innovative", "no_production"] }
    },
    {
      id: "algo_kai",
      direction: "algo",
      name: "阿凯算法团队",
      lead: "阿凯",
      avgYears: 6,
      desc: "算法老手团队，做过两代通信算法，指标不惊艳但能落地。到点下班，周末不回消息。",
      leadBio: "阿凯，通信算法老手，定点化和量产经验很足。",
      tags: ["算法老手", "落地型", "高预算", "不加班"],
      clues: [
        "指标一般，但流片后很少出问题。",
        "对新论文不感兴趣，对功耗和定点化很敏感。",
        "愿意带新人，但不擅长讲漂亮话。"
      ],
      fit: 1.05,
      hidden: { skill: 78, quality: 82, speed: 55, collab: 65, stability: 72, bias: 8, traits: ["production_ready", "conservative"] }
    },
    {
      id: "algo_lab",
      direction: "algo",
      name: "高校算法团队",
      lead: "陈教授",
      avgYears: 3,
      desc: "高校联合实验室，论文指标很漂亮，工程化要人兜底。",
      leadBio: "陈教授，高校实验室负责人，论文强，工程化弱。",
      tags: ["学术", "便宜", "论文强"],
      clues: [
        "论文指标很漂亮，但没考虑定点误差。",
        "学生流动率高，代码风格不统一。",
        "便宜，但需要工程团队收尾。"
      ],
      fit: 1.0,
      hidden: { skill: 80, quality: 45, speed: 60, collab: 50, stability: 55, bias: 15, traits: ["academic", "integration_risk", "high_turnover"] }
    },
    {
      id: "rtl_wang",
      direction: "rtl",
      name: "老王 RTL 团队",
      lead: "老王",
      avgYears: 5,
      desc: "大厂 RTL 团队，做过三颗 SoC，交付快，lint 习惯一般。不服管，猎头电话多。",
      leadBio: "老王，大厂 RTL 负责人，交付猛，质量靠后期修。",
      tags: ["快手", "大厂背景", "质量风险", "不服管", "跳槽风险"],
      clues: [
        "功能交付很快，但 lint 警告常年不清。",
        "上一颗芯片流片后改了三个 ECO。",
        "加班很猛，但不喜欢写文档。"
      ],
      fit: 1.0,
      hidden: { skill: 84, quality: 58, speed: 85, collab: 60, stability: 55, bias: 10, traits: ["fast", "lint_dirty", "eco_prone"] }
    },
    {
      id: "rtl_jie",
      direction: "rtl",
      name: "阿杰 RTL 团队",
      lead: "阿杰",
      avgYears: 3,
      desc: "三个人，出活快，质量看运气。三个人能连轴转。",
      leadBio: "阿杰，RTL 快手，功能对得快，lint 习惯差。",
      tags: ["便宜", "快手", "粗放", "能加班"],
      clues: [
        "功能对得快，但 lint 警告堆得快。",
        "上一颗芯片改了三个 ECO。",
        "人少，关键模块没有 backup。"
      ],
      fit: 1.0,
      hidden: { skill: 80, quality: 52, speed: 82, collab: 60, stability: 65, bias: 8, traits: ["fast", "lint_dirty", "bus_factor"] }
    },
    {
      id: "rtl_outsource",
      direction: "rtl",
      name: "外包 RTL 团队",
      lead: "老吴",
      avgYears: 2,
      desc: "便宜、人多、能加班，但流动率高。",
      leadBio: "老吴，外包 RTL 负责人，人手足，接口经常换人。",
      tags: ["外包", "便宜", "人多"],
      clues: [
        "人很多，但关键模块换过三拨人。",
        "交付快，集成时接口经常对不上。",
        "报价便宜，改动要加钱。"
      ],
      fit: 0.95,
      hidden: { skill: 60, quality: 48, speed: 75, collab: 65, stability: 40, bias: 12, traits: ["outsourced", "high_turnover", "integration_risk"] }
    },
    {
      id: "dv_lin",
      direction: "dv",
      name: "小林验证团队",
      lead: "小林",
      avgYears: 5,
      desc: "只做过小模块，但问的问题很细；她说没问题，通常是真的。",
      leadBio: "小林，验证细节控，覆盖率模型很清楚，不轻易说没问题。",
      tags: ["谦虚", "细节控", "可靠"],
      clues: [
        "她说自己不行的项目，最好别硬推。",
        "能讲清三种覆盖率模型。",
        "对加班没意见，但坚持要留回归时间。"
      ],
      fit: 1.1,
      hidden: { skill: 86, quality: 84, speed: 60, collab: 75, stability: 75, bias: -22, traits: ["meticulous", "modest"] }
    },
    {
      id: "dv_zhao",
      direction: "dv",
      name: "老赵验证团队",
      lead: "老赵",
      avgYears: 7,
      desc: "验证流程专家，覆盖率不收敛不下班，慢但稳。不加班。",
      leadBio: "老赵，验证流程专家，环境稳，节奏慢。",
      tags: ["流程控", "稳", "慢", "不加班"],
      clues: [
        "回归环境三年没崩过。",
        "对新协议、新工具接受度一般。",
        "坚持每个 bug 都要有复现用例。"
      ],
      fit: 1.0,
      hidden: { skill: 82, quality: 88, speed: 45, collab: 55, stability: 85, bias: -8, traits: ["process_heavy", "slow", "reliable"] }
    },
    {
      id: "dv_outsource",
      direction: "dv",
      name: "外包验证团队",
      lead: "老钱",
      avgYears: 2,
      desc: "便宜、人多、回归跑得勤，覆盖率数字很好看。能加班跑回归。",
      leadBio: "老钱，外包验证负责人，跑回归很勤，覆盖质量一般。",
      tags: ["外包", "便宜", "数字好看", "能加班"],
      clues: [
        "覆盖率数字很好看，但很多是重复用例。",
        "定向用例要另外加钱。",
        "流动率高，环境经常重建。"
      ],
      fit: 0.95,
      hidden: { skill: 62, quality: 50, speed: 70, collab: 65, stability: 45, bias: 15, traits: ["outsourced", "coverage_theater", "high_turnover"] }
    },
    {
      id: "midend_may",
      direction: "midend",
      name: "阿 May 中端团队",
      lead: "阿 May",
      avgYears: 6,
      desc: "综合 / DFT 全能，上一颗芯片一次 signoff 过；身价高，稳定性一般。高维护，跳槽风险。",
      leadBio: "阿 May，中端明星，综合/DFT 很强，稳定性一般。",
      tags: ["高身价", "履历漂亮", "强", "不服管", "跳槽风险"],
      clues: [
        "上一颗芯片“一次过”的项目，她只待了最后三个月。",
        "对 DFT 覆盖率很敏感，但不太愿意做低功耗。",
        "开价高，且要求独立办公室。"
      ],
      fit: 1.05,
      hidden: { skill: 88, quality: 82, speed: 65, collab: 60, stability: 40, bias: 12, traits: ["star", "job_hopper", "expensive"] }
    },
    {
      id: "midend_gu",
      direction: "midend",
      name: "小顾综合团队",
      lead: "小顾",
      avgYears: 3,
      desc: "便宜、听话、能跑流程；遇到低功耗和 RTL 冲突时，只会按脚本办事。",
      leadBio: "小顾，外包综合负责人，脚本熟练，方案模板化。",
      tags: ["外包", "便宜", "模板化"],
      clues: [
        "外包团队流动率高。",
        "只会跑现成脚本，遇到新工艺要人带。",
        "低功耗方案只会套模板。"
      ],
      fit: 0.95,
      hidden: { skill: 58, quality: 55, speed: 60, collab: 65, stability: 50, bias: 12, traits: ["outsourced", "script_driven", "low_power_gap"] }
    },
    {
      id: "midend_team",
      direction: "midend",
      name: "中端双核团队",
      lead: "老韩",
      avgYears: 5,
      desc: "综合、DFT、低功耗各有人，预算不低，但中端最稳。流程重，不加班。",
      leadBio: "老韩，中端负责人，综合/DFT/低功耗各有人，流程重。",
      tags: ["均衡", "高预算", "稳", "不加班"],
      clues: [
        "三个人各管一摊，接口文档写得很细。",
        "预算高，但很少在中端翻车。",
        "决策慢，什么都要求评审。"
      ],
      fit: 1.0,
      hidden: { skill: 76, quality: 75, speed: 60, collab: 70, stability: 65, bias: 5, traits: ["balanced", "document_heavy"] }
    },
    {
      id: "backend_chen",
      direction: "backend",
      name: "老陈后端团队",
      lead: "老陈",
      avgYears: 8,
      desc: "后端老法师团队，话少手稳；别让他们参加评审会，让他们安心做 floorplan。沟通差，不服管。",
      leadBio: "老陈，后端老法师，floorplan 很少返工，沟通很差。",
      tags: ["老法师", "手稳", "沟通差", "不服管"],
      clues: [
        "floorplan 很少返工，但不喜欢别人碰他的脚本。",
        "技术没问题，沟通要命。",
        "对流片前的 waiver 极其保守。"
      ],
      fit: 1.05,
      hidden: { skill: 88, quality: 86, speed: 55, collab: 35, stability: 80, bias: -10, traits: ["lone_wolf", "hand_steady", "waiver_conservative"] }
    },
    {
      id: "backend_xu",
      direction: "backend",
      name: "小许后端团队",
      lead: "小许",
      avgYears: 2,
      desc: "刚转后端一年，便宜、肯加班、愿意学；时序收敛和 DRC 会教你做人。",
      leadBio: "小许，后端新人，肯学，signoff 前需要人兜底。",
      tags: ["新人", "便宜", "肯学", "能加班"],
      clues: [
        "上一颗芯片只做到模块级。",
        "时序收敛的理解还停留在“多跑几遍”。",
        "便宜，但 signoff 前可能要人兜底。"
      ],
      fit: 0.95,
      hidden: { skill: 60, quality: 58, speed: 65, collab: 70, stability: 60, bias: -6, traits: ["junior", "learning", "signoff_risk"] }
    },
    {
      id: "backend_outsource",
      direction: "backend",
      name: "外包后端团队",
      lead: "老孙",
      avgYears: 3,
      desc: "人多、便宜、能熬夜；跑流程没问题，signoff 前要人兜底。",
      leadBio: "老孙，外包后端负责人，人多能熬，关键步骤没人负责。",
      tags: ["外包", "便宜", "人多"],
      clues: [
        "人多，能熬夜，但关键步骤没人负责。",
        "DRC 清得快，LVS 经常返工。",
        "报价便宜，signoff 支持要加钱。"
      ],
      fit: 0.95,
      hidden: { skill: 68, quality: 52, speed: 70, collab: 65, stability: 45, bias: 10, traits: ["outsourced", "drc_risk", "signoff_risk"] }
    },

    {
      id: "arch_hai",
      direction: "arch",
      name: "海归架构团队",
      lead: "老K",
      avgYears: 6,
      desc: "海外大厂架构团队，方法论完整，但不加班、不服管，猎头电话多。",
      leadBio: "老K，海外大厂架构负责人，方法论强，落地要人接。",
      tags: ["海归", "高预算", "不加班", "不服管", "跳槽风险"],
      clues: ["他讲架构像讲教科书，但不愿意下现场。", "团队不接受强排期，猎头电话很多。", "海外经验很漂亮，国内量产经验一般。"],
      fit: 1.05,
      hidden: { skill: 80, quality: 70, speed: 50, collab: 45, stability: 50, bias: 12, traits: ["paper_tiger", "ego", "job_hopper", "no_overtime", "not_manageable"] }
    },
    {
      id: "arch_lab",
      direction: "arch",
      name: "高校架构组",
      lead: "陈老师",
      avgYears: 3,
      desc: "高校联合架构组，便宜、能加班，但工程落地要人兜底。",
      leadBio: "陈老师，高校架构负责人，论文强，工程弱。",
      tags: ["学术", "便宜", "能加班", "流动率高"],
      clues: ["架构图很漂亮，接口定义经常缺细节。", "学生流动率高，文档风格不统一。", "便宜，但需要工程团队收尾。"],
      fit: 0.95,
      hidden: { skill: 65, quality: 52, speed: 60, collab: 60, stability: 50, bias: 8, traits: ["academic", "integration_risk", "high_turnover", "eager"] }
    },
    {
      id: "algo_vet",
      direction: "algo",
      name: "通信算法老兵组",
      lead: "老宋",
      avgYears: 8,
      desc: "通信算法老兵，指标稳、能落地，但不加班。",
      leadBio: "老宋，通信算法老兵，做过两代量产芯片，节奏慢。",
      tags: ["算法老兵", "不加班", "稳"],
      clues: ["指标不惊艳，但流片后很少出问题。", "到点下班，周末不回消息。", "对新论文不感兴趣，对定点化很敏感。"],
      fit: 1.05,
      hidden: { skill: 82, quality: 82, speed: 45, collab: 55, stability: 80, bias: -5, traits: ["production_ready", "no_overtime", "conservative"] }
    },
    {
      id: "algo_ai",
      direction: "algo",
      name: "AI 算法组",
      lead: "小艾",
      avgYears: 3,
      desc: "AI 算法组，能加班、指标新，但量产经验少。",
      leadBio: "小艾，AI 算法负责人，模型新，工程化靠别人。",
      tags: ["AI", "能加班", "便宜", "经验少"],
      clues: ["模型指标很新，但没考虑定点误差。", "愿意通宵调模型，不太愿意写文档。", "便宜，但量产经验少。"],
      fit: 1.0,
      hidden: { skill: 84, quality: 55, speed: 75, collab: 65, stability: 50, bias: 10, traits: ["innovative", "eager", "no_production", "integration_risk"] }
    },
    {
      id: "rtl_senior",
      direction: "rtl",
      name: "大厂 RTL 老兵组",
      lead: "老马",
      avgYears: 8,
      desc: "大厂 RTL 老兵组，质量稳，但不加班、不服管。",
      leadBio: "老马，大厂 RTL 老兵，质量稳，脾气也稳。",
      tags: ["老兵", "不加班", "不服管", "质量稳"],
      clues: ["代码质量很好，但不愿意赶工。", "评审会上不接受外行指挥。", "到点下班，猎头电话不少。"],
      fit: 1.0,
      hidden: { skill: 82, quality: 80, speed: 50, collab: 40, stability: 75, bias: -8, traits: ["hand_steady", "lone_wolf", "no_overtime", "not_manageable"] }
    },
    {
      id: "rtl_rookie",
      direction: "rtl",
      name: "应届 RTL 突击队",
      lead: "小丁",
      avgYears: 1,
      desc: "应届 RTL 突击队，便宜、能加班，但 lint 和 backup 都缺。",
      leadBio: "小丁，应届 RTL 负责人，能熬夜，经验浅。",
      tags: ["应届", "便宜", "能加班", "质量风险"],
      clues: ["三个人能连轴转，但关键模块没有 backup。", "lint 警告很多，交付前才清。", "便宜，但需要人带。"],
      fit: 0.95,
      hidden: { skill: 55, quality: 45, speed: 75, collab: 75, stability: 55, bias: -10, traits: ["eager", "junior", "lint_dirty", "bus_factor"] }
    },
    {
      id: "dv_lead",
      direction: "dv",
      name: "验证架构组",
      lead: "老蒋",
      avgYears: 7,
      desc: "验证架构组，覆盖率和流程都很强，但不加班。",
      leadBio: "老蒋，验证架构负责人，流程和覆盖率都很强。",
      tags: ["验证架构", "不加班", "高预算"],
      clues: ["回归环境搭得很好，但到点下班。", "覆盖率不收敛就不签字。", "预算高，但很少在验证上翻车。"],
      fit: 1.05,
      hidden: { skill: 85, quality: 85, speed: 50, collab: 60, stability: 70, bias: -5, traits: ["meticulous", "process_heavy", "no_overtime"] }
    },
    {
      id: "dv_ai",
      direction: "dv",
      name: "AI 验证组",
      lead: "小苏",
      avgYears: 3,
      desc: "AI 验证组，能加班、工具新，但覆盖率数字有水分。",
      leadBio: "小苏，AI 验证负责人，工具新，覆盖质量一般。",
      tags: ["AI", "能加班", "数字好看"],
      clues: ["覆盖率数字很好看，但很多是重复用例。", "愿意通宵跑回归，工具链很强。", "便宜，但定向用例经验少。"],
      fit: 0.95,
      hidden: { skill: 70, quality: 60, speed: 75, collab: 65, stability: 55, bias: 8, traits: ["eager", "coverage_theater", "learning"] }
    },
    {
      id: "midend_power",
      direction: "midend",
      name: "低功耗专精组",
      lead: "老秦",
      avgYears: 7,
      desc: "低功耗专精组，功耗和综合很强，但不加班。",
      leadBio: "老秦，低功耗专家，功耗和综合很强，节奏慢。",
      tags: ["低功耗", "不加班", "专精"],
      clues: ["功耗方案很细，但不接受赶工。", "综合和低功耗很强，DFT 一般。", "到点下班，周末不接电话。"],
      fit: 1.05,
      hidden: { skill: 80, quality: 78, speed: 55, collab: 65, stability: 70, bias: 5, traits: ["specialist", "no_overtime", "low_power_expert"] }
    },
    {
      id: "midend_rookie",
      direction: "midend",
      name: "应届中端组",
      lead: "小鲁",
      avgYears: 2,
      desc: "应届中端组，便宜、能加班，但只会跑脚本。",
      leadBio: "小鲁，中端新人，脚本熟练，方案模板化。",
      tags: ["应届", "便宜", "能加班", "模板化"],
      clues: ["脚本跑得很熟，遇到新工艺要人带。", "愿意熬夜，但方案只会套模板。", "便宜，但低功耗经验少。"],
      fit: 0.95,
      hidden: { skill: 55, quality: 50, speed: 70, collab: 70, stability: 55, bias: -8, traits: ["eager", "script_driven", "high_turnover"] }
    },
    {
      id: "backend_top",
      direction: "backend",
      name: "后端专家团",
      lead: "老龚",
      avgYears: 9,
      desc: "后端专家团，质量和时序很强，但不加班、不服管。",
      leadBio: "老龚，后端专家，floorplan 和时序很强，沟通很差。",
      tags: ["专家", "不加班", "不服管", "手稳"],
      clues: ["floorplan 很少返工，但不接受别人改脚本。", "技术很强，沟通要命。", "到点下班，流片前也不加班。"],
      fit: 1.05,
      hidden: { skill: 85, quality: 85, speed: 45, collab: 40, stability: 80, bias: -8, traits: ["lone_wolf", "no_overtime", "not_manageable", "hand_steady"] }
    },
    {
      id: "backend_fast",
      direction: "backend",
      name: "后端突击组",
      lead: "小雷",
      avgYears: 3,
      desc: "后端突击组，便宜、能熬夜，但 DRC/signoff 要人兜底。",
      leadBio: "小雷，后端突击负责人，能熬夜，质量看运气。",
      tags: ["突击", "能加班", "DRC风险"],
      clues: ["人多能熬夜，但关键步骤没人负责。", "DRC 清得快，LVS 经常返工。", "便宜，但 signoff 前要人兜底。"],
      fit: 0.95,
      hidden: { skill: 65, quality: 55, speed: 80, collab: 65, stability: 50, bias: 10, traits: ["eager", "drc_risk", "signoff_risk"] }
    }
  ];

  var TEAM_TRAITS = {
    arch_wang: ["no_overtime", "not_manageable", "job_hopper"],
    arch_xu: ["no_overtime"],
    algo_kai: ["no_overtime"],
    dv_zhao: ["no_overtime"],
    midend_team: ["no_overtime"],
    rtl_wang: ["not_manageable", "job_hopper"],
    midend_may: ["not_manageable"],
    backend_chen: ["not_manageable"],
    algo_xia: ["eager"],
    rtl_jie: ["eager"],
    backend_xu: ["eager"],
    rtl_outsource: ["eager"],
    dv_outsource: ["eager"]
  };

  GC.candidateTeams.forEach(function (team) {
    (TEAM_TRAITS[team.id] || []).forEach(function (trait) {
      if (team.hidden.traits.indexOf(trait) < 0) team.hidden.traits.push(trait);
    });
  });

  GC.levelPay = {
    top: 12.5,
    expert: 9,
    senior: 6.5,
    engineer: 4,
    junior: 2.5
  };

  var TEAM_LEVELS = {
    arch_wang: { top: 1, expert: 1, senior: 1, engineer: 1, junior: 1 },
    arch_xu: { top: 0, expert: 1, senior: 2, engineer: 1, junior: 0 },
    arch_outsource: { top: 0, expert: 0, senior: 0, engineer: 3, junior: 3 },
    algo_xia: { top: 0, expert: 1, senior: 0, engineer: 1, junior: 1 },
    algo_kai: { top: 1, expert: 1, senior: 1, engineer: 2, junior: 0 },
    algo_lab: { top: 0, expert: 1, senior: 1, engineer: 1, junior: 1 },
    rtl_wang: { top: 1, expert: 1, senior: 1, engineer: 2, junior: 0 },
    rtl_jie: { top: 0, expert: 1, senior: 1, engineer: 1, junior: 0 },
    rtl_outsource: { top: 0, expert: 0, senior: 0, engineer: 3, junior: 3 },
    dv_lin: { top: 0, expert: 1, senior: 2, engineer: 1, junior: 0 },
    dv_zhao: { top: 1, expert: 1, senior: 2, engineer: 1, junior: 0 },
    dv_outsource: { top: 0, expert: 0, senior: 0, engineer: 2, junior: 4 },
    midend_may: { top: 1, expert: 1, senior: 0, engineer: 1, junior: 0 },
    midend_gu: { top: 0, expert: 0, senior: 1, engineer: 2, junior: 1 },
    midend_team: { top: 1, expert: 1, senior: 1, engineer: 2, junior: 1 },
    backend_chen: { top: 1, expert: 1, senior: 1, engineer: 1, junior: 0 },
    backend_xu: { top: 0, expert: 0, senior: 1, engineer: 1, junior: 1 },
    backend_outsource: { top: 0, expert: 0, senior: 1, engineer: 3, junior: 2 },
    arch_hai: { top: 1, expert: 1, senior: 1, engineer: 2, junior: 0 },
    arch_lab: { top: 0, expert: 1, senior: 1, engineer: 1, junior: 1 },
    algo_vet: { top: 1, expert: 1, senior: 1, engineer: 1, junior: 0 },
    algo_ai: { top: 0, expert: 1, senior: 1, engineer: 2, junior: 1 },
    rtl_senior: { top: 1, expert: 1, senior: 1, engineer: 1, junior: 0 },
    rtl_rookie: { top: 0, expert: 0, senior: 1, engineer: 2, junior: 2 },
    dv_lead: { top: 1, expert: 1, senior: 2, engineer: 1, junior: 0 },
    dv_ai: { top: 0, expert: 1, senior: 1, engineer: 1, junior: 1 },
    midend_power: { top: 1, expert: 1, senior: 0, engineer: 1, junior: 0 },
    midend_rookie: { top: 0, expert: 0, senior: 1, engineer: 2, junior: 1 },
    backend_top: { top: 1, expert: 1, senior: 0, engineer: 1, junior: 0 },
    backend_fast: { top: 0, expert: 1, senior: 1, engineer: 2, junior: 1 }
  };

  GC.candidateTeams.forEach(function (team) {
    var lv = TEAM_LEVELS[team.id];
    team.levels = lv;
    team.headcount = lv.top + lv.expert + lv.senior + lv.engineer + lv.junior;
    team.salary =
      lv.top * GC.levelPay.top +
      lv.expert * GC.levelPay.expert +
      lv.senior * GC.levelPay.senior +
      lv.engineer * GC.levelPay.engineer +
      lv.junior * GC.levelPay.junior;
  });
})(typeof window !== "undefined" ? window : globalThis);
