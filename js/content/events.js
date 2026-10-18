(function (global) {
  var GC = (global.GameContent = global.GameContent || {});

  GC.events = [
    {
      id: "spec_split",
      title: "规格分歧",
      months: [1],
      weight: 1,
      text:
        "客户说“和上一代差不多”，但算法负责人坚持要改接口。销售已经答应客户月底冻结规格。",
      options: [
        {
          label: "按客户说的做",
          effects: { progress: { arch: 5, algo: 5 }, market: -5, flags: ["spec_ambiguous"] },
          result: "规格看起来冻结了，但接口里的模糊地带会在验证阶段回来。"
        },
        {
          label: "按算法负责人做",
          effects: { progress: { algo: 8, arch: 5 }, budget: -25 },
          result: "架构更干净，但客户关系紧张，销售开始躲着你。"
        },
        {
          label: "拉齐三方会议",
          effects: { progress: { arch: 3, algo: 3 }, quality: { arch: 3 }, morale: -5, budget: -15 },
          result: "吵了三天，接口终于对齐。至少后面不用猜了。"
        }
      ]
    },
    {
      id: "algo_dream",
      title: "算法指标太漂亮",
      months: [1],
      weight: 1,
      text:
        "算法模型仿真性能超标 40%，但还没做定点化。算法团队说“理论上没问题”，架构团队说“先按这个做架构”。",
      options: [
        {
          label: "先做定点验证",
          effects: { progress: { algo: -5 }, quality: { algo: 8 }, budget: -30, flags: ["algo_checked"] },
          result: "指标掉了 12%，但至少是真的。架构按保守数字走。"
        },
        {
          label: "相信模型",
          effects: { progress: { algo: 10 }, flags: ["algo_risk"] },
          result: "架构按最漂亮的数字做了。你决定先不把担心写进会议纪要。"
        },
        {
          label: "让架构团队评估",
          effects: { progress: { arch: 5 }, morale: -3, budget: -15 },
          result: "架构团队说“问题不大”，你决定先记下来，但没写进风险清单。"
        }
      ]
    },
    {
      id: "ip_delay",
      title: "关键 IP 延迟",
      months: [2],
      weight: 1,
      text:
        "关键 IP 供应商说晚两周交付。RTL 团队已经有人闲着了，负责人开始频繁看手机。",
      options: [
        {
          label: "等",
          effects: { progress: { rtl: -10 }, delay: 1 },
          result: "进度滑了一周，供应商说“下周一定”。你不太信。"
        },
        {
          label: "换 IP",
          effects: { budget: -60, progress: { rtl: -3 }, quality: { rtl: -3 } },
          result: "新 IP 接口不一样，集成又花了一周。至少东西到了。"
        },
        {
          label: "自己写",
          effects: {
            budget: -30,
            progress: { rtl: -8 },
            quality: { rtl: -5 },
            delayed: [{ months: 1, effects: { progress: { rtl: -5 } }, text: "自研 IP 的 bug 在下个月冒出来。" }]
          },
          result: "自己写省了授权费，但埋了一颗雷。"
        }
      ]
    },
    {
      id: "dv_env",
      title: "验证环境卡住了",
      months: [2],
      weight: 1,
      text:
        "验证环境被工具链卡住，跑一个用例要 40 分钟。验证团队说再这样下去覆盖率起不来。",
      options: [
        {
          label: "买工具支持",
          effects: { budget: -45, progress: { dv: 10 }, quality: { dv: 3 } },
          result: "工具厂远程解决了 license 和编译问题。钱花得值。"
        },
        {
          label: "让 RTL 帮忙",
          effects: { progress: { dv: 5, rtl: -5 }, morale: -3 },
          result: "RTL 团队骂骂咧咧地修了环境，自己的进度也受影响。"
        },
        {
          label: "先跳过",
          effects: { progress: { dv: -8 }, flags: ["dv_env_gap"] },
          result: "环境勉强能跑，但很多 corner 没覆盖。你决定先不说。"
        }
      ]
    },
    {
      id: "synthesis_fire",
      title: "综合时序爆炸",
      months: [3],
      weight: 1,
      text:
        "中端第一次综合，setup violation 一大把，功耗超 18%。中端团队说 RTL 写法有问题，RTL 团队说中端约束太紧。",
      options: [
        {
          label: "让 RTL 修",
          effects: { progress: { rtl: -8, midend: 10 }, quality: { midend: 3 }, budget: -25 },
          result: "RTL 团队改了两周，综合终于干净了一点。前端进度也少了两周。"
        },
        {
          label: "中端自己优化",
          effects: { progress: { midend: 5 }, quality: { midend: -3 }, delay: 1 },
          result: "中端用脚本硬压，时序余量越来越薄。"
        },
        {
          label: "降频",
          effects: { market: -8, progress: { midend: 12 }, quality: { midend: 3 } },
          result: "频率降了 8%，综合好看了，客户脸色不太好看。"
        }
      ]
    },
    {
      id: "coverage_plateau",
      title: "覆盖率停滞",
      months: [3],
      weight: 1,
      text:
        "覆盖率卡在 55%，验证团队说剩下的 corner 要写定向用例，至少两周。你手里没有两周。",
      options: [
        {
          label: "加验证",
          effects: { budget: -45, coverage: 10, progress: { dv: 5 } },
          result: "你临时加了一个验证工程师，覆盖率开始动。"
        },
        {
          label: "让设计自测",
          effects: { coverage: 5, quality: { rtl: -3 }, morale: -3 },
          result: "设计自己写的测试，覆盖的都是自己相信的路径。"
        },
        {
          label: "接受风险",
          effects: { coverage: -5, flags: ["coverage_gap"] },
          result: "你决定先保进度，把风险留到 signoff。"
        }
      ]
    },
    {
      id: "floorplan_congestion",
      title: "floorplan 拥塞",
      months: [4],
      weight: 1,
      text:
        "后端 floorplan 发现布线拥塞，面积要涨 8%。后端团队说“早说了 RTL 模块太大”，RTL 团队说“现在改来不及”。",
      options: [
        {
          label: "放宽面积",
          effects: { budget: -40, progress: { backend: 8 }, market: -3 },
          result: "面积涨了，封装成本跟着涨。后端团队的脸色好了一点。"
        },
        {
          label: "让前端改 RTL",
          effects: { progress: { rtl: -6, backend: 6 }, quality: { backend: 3 } },
          result: "前端返工，后端终于有空间布线。RTL 团队两天没说话。"
        },
        {
          label: "硬推",
          effects: { progress: { backend: 3 }, quality: { backend: -8 }, flags: ["backend_risk"] },
          result: "硬推的代价会在时序和 DRC 上出现。"
        }
      ]
    },
    {
      id: "competitor",
      title: "竞品提前发布",
      months: [4],
      weight: 1,
      text:
        "竞争对手提前发布了同规格产品，客户开始暗示“窗口不等人”。流程不会因此缩短，你只能选择怎么应对。",
      options: [
        {
          label: "加班保证进度",
          effects: { progress: { rtl: 5, dv: 5, midend: 5, backend: 5 }, morale: -5, quality: { rtl: -3, dv: -3, backend: -3 }, market: 3, flags: ["rush"] },
          result: "流程没有缩短，团队只能靠加班把进度抢回来。窗口暂时保住了，质量和士气都在付代价。"
        },
        {
          label: "砍功能",
          effects: { market: -8, progress: { rtl: 5, dv: 5, midend: 5, backend: 5 }, flags: ["cut_scope"] },
          result: "砍掉两个非核心功能，客户勉强接受。"
        },
        {
          label: "维持原计划",
          effects: { market: -3 },
          result: "你决定按原计划走，销售开始天天来问。"
        }
      ]
    },
    {
      id: "poach",
      title: "关键工程师被挖",
      months: [5],
      weight: 1,
      text:
        "关键工程师收到猎头 offer，团队里开始有人打听年终奖。你不确定消息是谁放出去的。",
      options: [
        {
          label: "加薪留人",
          effects: { budget: -60, morale: 10 },
          result: "人留住了，预算少了一截。财务又发来一封邮件。"
        },
        {
          label: "画饼",
          effects: { morale: -8, flags: ["retention_risk"] },
          result: "人暂时没走，但信任少了一点。"
        },
        {
          label: "放两天假",
          effects: { budget: -15, morale: 5 },
          result: "团队喘了口气，进度没怎么动。"
        }
      ]
    },
    {
      id: "late_bug",
      title: "流片前的 bug",
      months: [5, 6],
      weight: 2,
      text:
        "验证在最后一个 corner 发现 DMA burst 死锁。验证团队说这个必须修，RTL 团队说“软件可以绕”。",
      options: [
        {
          label: "修",
          effects: { progress: { rtl: -5 }, bugs: -10, delay: 1, quality: { rtl: 3 } },
          result: "bug 修了，流片窗口少了一周。"
        },
        {
          label: "Waive",
          effects: { bugs: 5, flags: ["known_bug"] },
          result: "你把它记进 errata，希望客户不会踩到。"
        },
        {
          label: "软件绕过",
          effects: { market: -3, bugs: -5 },
          result: "软件团队答应加 workaround，性能掉了一点。"
        }
      ]
    },
    {
      id: "foundry_slot",
      title: "代工厂 slot",
      months: [6],
      weight: 1,
      text:
        "代工厂说流片 slot 可能保不住，除非加钱。财务问你“这颗芯片真的能回本吗”。",
      options: [
        {
          label: "花钱保 slot",
          effects: { budget: -45 },
          result: "slot 保住了，财务又发来一封邮件。"
        },
        {
          label: "接受推迟",
          effects: { delay: 2, market: -5 },
          result: "流片推迟两周，客户开始找备选方案。"
        },
        {
          label: "换工艺角",
          effects: { budget: -25, quality: { backend: -3 }, delay: 1 },
          result: "换了个 corner，风险和后端一起增加。"
        }
      ]
    },
    {
      id: "team_conflict",
      title: "评审会吵起来了",
      months: [2, 3, 4, 5],
      weight: 1,
      text:
        "RTL 团队里两位资深工程师在评审会上吵起来了。一个说架构没问题，一个说 RTL 已经改不动。所有人都在等你看谁。",
      options: [
        {
          label: "调解",
          effects: { morale: 5, budget: -15 },
          result: "你把两个人关在会议室里，出来时至少能说话了。"
        },
        {
          label: "站 RTL 负责人",
          effects: { morale: -5, progress: { arch: 5 }, quality: { rtl: -2 } },
          result: "负责人保住了，团队里另一个人开始沉默。"
        },
        {
          label: "不管",
          effects: { morale: -8, progress: { rtl: -3 } },
          result: "会议不欢而散，第二天两个人都不回消息。"
        }
      ]
    },

    {
      id: "customer_change",
      title: "客户改需求",
      months: [1],
      weight: 1,
      text: "客户突然要改接口，说“和上一代兼容就行”，但销售已经答应月底冻结规格。",
      options: [
        { label: "接受变更", effects: { progress: { arch: 5, algo: 5 }, market: -5, budget: -30 }, result: "接口改了，架构和算法重新对齐，客户暂时满意。" },
        { label: "顶回去", effects: { market: -3, morale: -3 }, result: "你保住了规格，客户说要再评估。" },
        { label: "冻结旧接口，后面打补丁", effects: { progress: { arch: -5 }, market: 3, flags: ["spec_debt"] }, result: "规格冻结了，但技术债留到了后面。" }
      ]
    },
    {
      id: "arch_algo_fight",
      title: "架构和算法吵起来了",
      months: [1],
      weight: 1,
      text: "架构团队要保接口稳定，算法团队要改数据通路。两边都说对方不懂。",
      options: [
        { label: "拉齐评审", effects: { progress: { arch: 3, algo: 3 }, morale: -3, budget: -20 }, result: "吵了一下午，至少有了共同版本。" },
        { label: "站算法", effects: { progress: { algo: 5, arch: -5 }, morale: -3 }, result: "算法指标保住了，架构开始返工。" },
        { label: "站架构", effects: { progress: { arch: 5, algo: -5 }, morale: -3 }, result: "架构稳住了，算法团队开始沉默。" }
      ]
    },
    {
      id: "rtl_cdc",
      title: "CDC 警报",
      months: [2],
      weight: 1,
      text: "RTL 首版跑 CDC，发现跨时钟域路径没处理干净。综合团队已经在等网表。",
      options: [
        { label: "停下来修", effects: { progress: { rtl: -5 }, quality: { rtl: 5 }, budget: -30 }, result: "CDC 清掉了，RTL 进度少了一周。" },
        { label: "先 waive", effects: { quality: { rtl: -5 }, flags: ["cdc_risk"], delayed: [{ months: 1, effects: { bugs: 5 }, text: "CDC 问题在验证后期冒出来。" }] }, result: "你签了 waiver，风险留到了后面。" },
        { label: "买工具检查", effects: { budget: -45, quality: { rtl: 3 } }, result: "工具扫了一遍，问题少了一些。" }
      ]
    },
    {
      id: "dv_license",
      title: "验证 license 到期",
      months: [2],
      weight: 1,
      text: "验证环境的关键 license 到期，回归队列开始堆积。采购说续费要走流程。",
      options: [
        { label: "加急续费", effects: { budget: -60, progress: { dv: 8 } }, result: "license 续上了，回归重新跑起来。" },
        { label: "先蹭别的项目", effects: { progress: { dv: -5 }, morale: -3 }, result: "license 暂时能用，但随时可能被踢下线。" },
        { label: "停几天", effects: { progress: { dv: -8 }, delay: 1 }, result: "验证停摆，窗口滑了一周。" }
      ]
    },
    {
      id: "dft_fail",
      title: "DFT 插入失败",
      months: [3],
      weight: 1,
      text: "中端插入 DFT 后发现扫描链覆盖不足，量产测试会有盲区。",
      options: [
        { label: "返工 DFT", effects: { progress: { midend: -5 }, quality: { midend: 5 }, budget: -30 }, result: "扫描链补上了，中端进度受影响。" },
        { label: "先接受", effects: { quality: { midend: -3 }, flags: ["dft_gap"] }, result: "DFT 覆盖不足，量产测试风险上升。" },
        { label: "找外包补", effects: { budget: -45, progress: { midend: 5 } }, result: "外包团队接手了一部分 DFT，预算又少了一截。" }
      ]
    },
    {
      id: "power_budget",
      title: "功耗超标",
      months: [3],
      weight: 1,
      text: "中端初评功耗超预算 18%，封装和散热都要重新评估。",
      options: [
        { label: "优化低功耗", effects: { progress: { midend: -5 }, quality: { midend: 5 }, budget: -30 }, result: "功耗压下去一点，进度也慢了一点。" },
        { label: "降频", effects: { market: -6, quality: { midend: 3 } }, result: "频率降了，功耗好看了，客户不太高兴。" },
        { label: "接受风险", effects: { quality: { midend: -3 }, flags: ["power_risk"] }, result: "你把功耗风险留到了 signoff。" }
      ]
    },
    {
      id: "rtl_rework",
      title: "RTL 0.75 返工",
      months: [3],
      weight: 1,
      text: "中端综合发现 RTL 0.75 里有一个模块接口写错了，必须返工。",
      options: [
        { label: "停下来修", effects: { progress: { rtl: -5 }, bugs: -8, delay: 1 }, result: "bug 修了，窗口少了一周。" },
        { label: "先冻结", effects: { quality: { rtl: -5 }, bugs: 5 }, result: "版本冻结了，bug 留到后面。" },
        { label: "加人修", effects: { budget: -45, progress: { rtl: 5 }, morale: -3 }, result: "临时加人，进度补回来一点，团队开始疲惫。" }
      ]
    },
    {
      id: "coverage_audit",
      title: "覆盖率对不上",
      months: [4],
      weight: 1,
      text: "验证报的覆盖率和第三方工具对不上，中间差了 9 个点。",
      options: [
        { label: "第三方审计", effects: { budget: -30, coverage: 5, quality: { dv: 3 } }, result: "审计发现了重复用例，覆盖率挤掉了一些水分。" },
        { label: "相信验证团队", effects: { coverage: -5, flags: ["coverage_gap"] }, result: "你选择相信报表，风险留到了回片。" },
        { label: "补定向用例", effects: { budget: -45, coverage: 8 }, result: "补了一批定向用例，覆盖率终于对上了。" }
      ]
    },
    {
      id: "clock_tree",
      title: "时钟树没收敛",
      months: [4],
      weight: 1,
      text: "后端发现时钟树 skew 偏大，高频 corner 可能过不去。",
      options: [
        { label: "重做时钟树", effects: { progress: { backend: -5 }, quality: { backend: 5 }, budget: -30 }, result: "时钟树重做，后端进度慢了一点。" },
        { label: "接受风险", effects: { quality: { backend: -5 }, flags: ["clock_risk"] }, result: "你选择先保进度，时钟风险留到了 signoff。" },
        { label: "先优化再跑", effects: { progress: { backend: 2 }, quality: { backend: -2 }, delay: 1 }, result: "优化了一版，窗口滑了一周。" }
      ]
    },
    {
      id: "customer_demo",
      title: "客户要来看 demo",
      months: [4],
      weight: 1,
      text: "客户突然要来现场看 demo，但验证还有几个 corner 没跑完。",
      options: [
        { label: "硬着头皮演示", effects: { market: 5, morale: -3, budget: -20 }, result: "demo 跑通了，团队在后台捏了一把汗。" },
        { label: "藏起问题", effects: { market: 3, flags: ["known_issue"] }, result: "客户没发现问题，你开始担心回片。" },
        { label: "先准备再演", effects: { progress: { dv: -3 }, quality: { dv: 3 }, budget: -20 }, result: "多准备了一天，demo 稳了一点。" }
      ]
    },
    {
      id: "eco_hell",
      title: "ECO 地狱",
      months: [5],
      weight: 1,
      text: "RTL freeze 后连续出现 ECO，每个都说是最后一个。",
      options: [
        { label: "全部修掉", effects: { progress: { rtl: -5 }, bugs: -8, delay: 1 }, result: "ECO 修完了，窗口又少了一周。" },
        { label: "只修高风险", effects: { bugs: 5, flags: ["eco_risk"] }, result: "低风险 ECO 被 waive，风险留到了回片。" },
        { label: "砍功能", effects: { market: -5, bugs: -5 }, result: "砍掉一个功能，ECO 少了一半。" }
      ]
    },
    {
      id: "team_burnout",
      title: "团队开始疲劳",
      months: [5],
      weight: 1,
      text: "连续加班后，团队开始出现低级错误。",
      options: [
        { label: "强制休息", effects: { morale: 8, progress: { rtl: -3, dv: -3, midend: -3, backend: -3 } }, result: "团队休息了两天，进度慢了一点。" },
        { label: "再顶一顶", effects: { morale: -8, progress: { rtl: 5, dv: 5, midend: 5, backend: 5 }, quality: { rtl: -3, backend: -3 } }, result: "进度上去了，错误率也上去了。" },
        { label: "发奖金", effects: { budget: -45, morale: 5 }, result: "奖金到账，团队情绪好了一点。" }
      ]
    },
    {
      id: "foundry_yield",
      title: "代工厂良率预警",
      months: [5],
      weight: 1,
      text: "代工厂说这个工艺角的良率 margin 偏薄，量产爬坡可能不顺。",
      options: [
        { label: "加钱保 margin", effects: { budget: -60, quality: { backend: 3 } }, result: "加钱换了一点 margin，财务又发来邮件。" },
        { label: "接受", effects: { flags: ["yield_risk"], market: -3 }, result: "你选择接受，量产风险留到了后面。" },
        { label: "换 corner", effects: { budget: -30, delay: 1 }, result: "换 corner 后窗口滑了一周。" }
      ]
    },
    {
      id: "signoff_dispute",
      title: "Signoff 清单有争议",
      months: [6],
      weight: 1,
      text: "签核会上，后端说有几条违规可以 waive，验证说有一条不能放。",
      options: [
        { label: "修掉争议项", effects: { budget: -45, quality: { backend: 5 }, delay: 1 }, result: "争议项修掉了，窗口又紧了一点。" },
        { label: "签字 waive", effects: { flags: ["signoff_risk"], quality: { backend: -2 } }, result: "你签了字，风险带到了硅上。" },
        { label: "升级评审", effects: { morale: -3, budget: -20 }, result: "评审升级了，至少责任分清楚了。" }
      ]
    },
    {
      id: "customer_push",
      title: "客户要求提前发布",
      months: [6],
      weight: 1,
      text: "客户要求提前发布，销售希望“先发一版再说”。",
      options: [
        { label: "逼团队提前", effects: { progress: { dv: 5, midend: 5, backend: 5 }, morale: -6, quality: { dv: -3, backend: -3 } }, result: "进度被硬拉上去，质量开始松动。" },
        { label: "砍功能保发布", effects: { market: -6, progress: { dv: 3, midend: 3, backend: 3 } }, result: "砍掉两个功能，客户勉强接受。" },
        { label: "拒绝", effects: { market: -3 }, result: "你拒绝了提前发布，客户开始找备选。" }
      ]
    },
    {
      id: "late_ip",
      title: "最后一个 IP 更新",
      months: [6],
      weight: 1,
      text: "关键 IP 供应商在流片前发来一个更新，说修了一个 corner bug。",
      options: [
        { label: "集成更新", effects: { progress: { rtl: -3 }, quality: { rtl: 3 }, delay: 1 }, result: "更新集成了，窗口滑了一周。" },
        { label: "不集成", effects: { flags: ["ip_risk"] }, result: "你决定不集成，风险留给回片。" },
        { label: "打补丁", effects: { budget: -30, quality: { rtl: 2 } }, result: "打了个 patch，预算又少了一点。" }
      ]
    }
  ];
})(typeof window !== "undefined" ? window : globalThis);
