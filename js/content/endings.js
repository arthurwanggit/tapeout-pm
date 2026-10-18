(function (global) {
  var GC = (global.GameContent = global.GameContent || {});

  GC.endings = [
    {
      id: "cash_crisis",
      title: "资金链断裂",
      grade: "D",
      subtitle: "芯片还在等产能，公司先等来了催款函",
      body:
        "流片回来了，bring-up 也过了。可量产预付款、封测账期和供应商催款同时到期，银行抽贷，资金链断了。芯片还在等产能，团队已经开始投简历。",
      condition: function (e) {
        return e.cashCrash === true;
      }
    },
    {
      id: "brick",
      title: "砖头",
      grade: "D",
      subtitle: "流片回来，bring-up 不亮",
      body:
        "实验室安静得可怕。示波器上什么都没有，软件团队问“是不是电源没接”。你开始怀疑人生，也怀疑 RTL。",
      condition: function (e) {
        return !e.works && e.condition === "dead";
      }
    },
    {
      id: "recall",
      title: "召回危机",
      grade: "D",
      subtitle: "点亮了，但客户现场炸了",
      body:
        "芯片点亮了，但严重 bug 在客户现场爆发。召回、公关、复盘，一个都少不了。你第一次觉得“点亮”不等于“成功”。",
      condition: function (e) {
        return e.works && e.severe === "fatal";
      }
    },
    {
      id: "limping",
      title: "跛脚芯片",
      grade: "C",
      subtitle: "能用，但不好用",
      body:
        "芯片没有完全跑起来：部分模块无响应，或者 errata 比预期多，量产受限。软件团队开始写 workaround，客户问“下一代什么时候”。",
      condition: function (e) {
        return (!e.works && e.condition === "partial") || (e.works && (e.severe === "major" || !e.mp));
      }
    },
    {
      id: "narcissism",
      title: "技术自嗨",
      grade: "B",
      subtitle: "叫好，但不叫座",
      body:
        "技术指标很漂亮，但市场窗口过了。销售说“叫好不叫座”，老板说“下次早点”。你保住了技术尊严，没保住项目奖金。",
      condition: function (e) {
        return e.works && e.severe !== "fatal" && e.mp && e.market < 40;
      }
    },
    {
      id: "hero",
      title: "天选 PM",
      grade: "S",
      subtitle: "一次点亮，量产，窗口命中",
      body:
        "芯片一次点亮，量产顺利，客户在发布会上点名感谢你。你只知道这六个月没人离职，而且你已经不记得上次睡整觉是什么时候。",
      condition: function (e) {
        return (
          e.grade === "S" &&
          e.works &&
          e.severe !== "fatal" &&
          e.severe !== "major" &&
          e.mp &&
          e.market >= 65 &&
          e.onTime
        );
      }
    },
    {
      id: "narrow",
      title: "惊险过关",
      grade: "D",
      subtitle: "项目交付了，代价不小",
      body:
        "芯片终于量产，但窗口、预算、团队都付出了代价。老板说“结果是好的”，你听不出这是表扬还是安慰。",
      condition: function (e) {
        return e.works && e.mp && e.score < 70;
      }
    },
    {
      id: "steady",
      title: "稳健交付",
      grade: "A",
      subtitle: "没有奇迹，也没有灾难",
      body:
        "芯片能用，量产爬坡慢一点，市场反应中规中矩。至少没有召回。老板说“不错”，你听不出是表扬还是别的意思。",
      condition: function () {
        return true;
      }
    }
  ];
})(typeof window !== "undefined" ? window : globalThis);
