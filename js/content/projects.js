(function (global) {
  var GC = (global.GameContent = global.GameContent || {});

  GC.projects = [
    {
      id: "xuanwu1",
      name: "通信 SoC",
      subtitle: "面向智能音频与感知的通信 SoC",
      brief:
        "客户要一颗面向智能音频的通信 SoC。算法指标写得很漂亮，可靠性条款有三页。项目周期 6 个月，预算 1500 万。",
      budget: 1500,
      months: 6,
      complexity: 10,
      marketWindow: 6,
      requirements: {
        performance: 0.9,
        power: 0.85,
        reliability: 0.7,
        cost: 0.6,
        schedule: 0.9
      },
      hidden:
        "真正的难点是算法定点化、低功耗和后端收敛。架构和算法如果只顾纸面指标，流片后会一起还债。",
      stageHints: [
        "M1：规格、架构、算法。先把接口和指标吵清楚，别急着开 RTL。",
        "M2：RTL 首版和验证环境。架构不冻结，后面全是返工。",
        "M3：RTL 0.75，中端进场。综合会第一次告诉你真相。",
        "M4：RTL 0.9，覆盖率启动，后端进场。人手开始不够用。",
        "M5：RTL freeze，验证收敛，后端迭代。freeze 不是终点。",
        "M6：修 bug、ECO、signoff。预算和窗口只够修一部分。"
      ]
    }
  ];
})(typeof window !== "undefined" ? window : globalThis);
