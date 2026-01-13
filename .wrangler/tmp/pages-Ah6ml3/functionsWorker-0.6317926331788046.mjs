var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-TtGR3L/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/ai/analyze.js
async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { startDate, endDate, type } = await request.json();
    const apiKey = env.AI_API_KEY;
    const apiBase = env.AI_API_BASE || "https://api.openai.com/v1";
    const model = env.AI_MODEL || "gpt-4o-mini";
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI API \u672A\u914D\u7F6E"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    let whereClause = "1=1";
    const params = [];
    if (startDate) {
      whereClause += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND date <= ?";
      params.push(endDate);
    }
    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }
    const records = await env.DB.prepare(`
      SELECT * FROM records WHERE ${whereClause} ORDER BY date DESC
    `).bind(...params).all();
    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      byCategory: {},
      byMonth: {},
      recordCount: records.results?.length || 0
    };
    for (const record of records.results || []) {
      if (record.type === "income") {
        stats.totalIncome += record.amount;
      } else {
        stats.totalExpense += record.amount;
      }
      if (!stats.byCategory[record.category]) {
        stats.byCategory[record.category] = { income: 0, expense: 0, count: 0 };
      }
      stats.byCategory[record.category][record.type] += record.amount;
      stats.byCategory[record.category].count++;
      const month = record.date.substring(0, 7);
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { income: 0, expense: 0 };
      }
      stats.byMonth[month][record.type] += record.amount;
    }
    stats.netBalance = stats.totalIncome - stats.totalExpense;
    if (stats.recordCount === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          stats,
          analysis: "\u6682\u65E0\u8BB0\u5F55\u6570\u636E\uFF0C\u65E0\u6CD5\u751F\u6210\u5206\u6790\u62A5\u544A\u3002\u8BF7\u5148\u6DFB\u52A0\u4E00\u4E9B\u6536\u652F\u8BB0\u5F55\u3002",
          suggestions: ["\u5F00\u59CB\u8BB0\u5F55\u60A8\u7684\u65E5\u5E38\u6536\u652F", "\u53EF\u4EE5\u4F7F\u7528\u81EA\u7136\u8BED\u8A00\u6216\u56FE\u7247\u5FEB\u901F\u8BB0\u8D26"]
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const dataSummary = `
\u5206\u6790\u65F6\u95F4\u8303\u56F4: ${startDate || "\u5168\u90E8"} \u81F3 ${endDate || "\u5168\u90E8"}
\u603B\u8BB0\u5F55\u6570: ${stats.recordCount}
\u603B\u6536\u5165: \xA5${stats.totalIncome.toFixed(2)}
\u603B\u652F\u51FA: \xA5${stats.totalExpense.toFixed(2)}
\u51C0\u4F59\u989D: \xA5${stats.netBalance.toFixed(2)}

\u6309\u7C7B\u522B\u7EDF\u8BA1:
${Object.entries(stats.byCategory).map(
      ([cat, data]) => `- ${cat}: \u6536\u5165\xA5${data.income.toFixed(2)}, \u652F\u51FA\xA5${data.expense.toFixed(2)}, ${data.count}\u7B14`
    ).join("\n")}

\u6309\u6708\u7EDF\u8BA1:
${Object.entries(stats.byMonth).sort().map(
      ([month, data]) => `- ${month}: \u6536\u5165\xA5${data.income.toFixed(2)}, \u652F\u51FA\xA5${data.expense.toFixed(2)}`
    ).join("\n")}

\u6700\u8FD110\u6761\u8BB0\u5F55:
${(records.results || []).slice(0, 10).map(
      (r) => `- ${r.date} ${r.type === "income" ? "\u6536\u5165" : "\u652F\u51FA"} \xA5${r.amount} ${r.category} ${r.description}`
    ).join("\n")}
`;
    const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8D22\u52A1\u5206\u6790\u5E08\u3002\u6839\u636E\u7528\u6237\u7684\u6536\u652F\u6570\u636E\uFF0C\u63D0\u4F9B\u8BE6\u7EC6\u7684\u8D22\u52A1\u5206\u6790\u548C\u5EFA\u8BAE\u3002

\u8BF7\u4EE5JSON\u683C\u5F0F\u8FD4\u56DE\uFF0C\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5:
- analysis: \u8BE6\u7EC6\u7684\u8D22\u52A1\u5206\u6790\u6587\u672C(500\u5B57\u4EE5\u5185)\uFF0C\u5305\u62EC:
  1. \u6574\u4F53\u8D22\u52A1\u72B6\u51B5\u8BC4\u4F30
  2. \u6536\u652F\u7ED3\u6784\u5206\u6790
  3. \u4E3B\u8981\u652F\u51FA\u7C7B\u522B\u5206\u6790
  4. \u8D8B\u52BF\u89C2\u5BDF(\u5982\u679C\u6709\u591A\u6708\u6570\u636E)
- suggestions: \u5177\u4F53\u7684\u7406\u8D22\u5EFA\u8BAE\u6570\u7EC4(3-5\u6761)
- highlights: \u91CD\u8981\u53D1\u73B0\u6216\u8B66\u793A\u6570\u7EC4(1-3\u6761)
- healthScore: \u8D22\u52A1\u5065\u5EB7\u8BC4\u5206(1-100)

\u53EA\u8FD4\u56DEJSON\uFF0C\u4E0D\u8981\u6709\u5176\u4ED6\u5185\u5BB9\u3002\u5206\u6790\u8981\u4E13\u4E1A\u3001\u5177\u4F53\u3001\u6709\u5EFA\u8BBE\u6027\u3002`;
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataSummary }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      return new Response(JSON.stringify({
        success: true,
        data: {
          stats,
          analysis: "AI \u5206\u6790\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u4EE5\u4E0B\u662F\u60A8\u7684\u6570\u636E\u7EDF\u8BA1\u6458\u8981\u3002",
          suggestions: [],
          aiError: true
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    let aiAnalysis = {
      analysis: "",
      suggestions: [],
      highlights: [],
      healthScore: 0
    };
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Parse AI response error:", e);
        aiAnalysis.analysis = content;
      }
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        stats,
        ...aiAnalysis
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AI analyze error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u5206\u6790\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");

// api/ai/ocr.js
async function onRequestPost2(context) {
  const { request, env } = context;
  try {
    const { image } = await request.json();
    if (!image) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u8BF7\u4E0A\u4F20\u56FE\u7247"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const apiKey = env.AI_API_KEY;
    const apiBase = env.AI_API_BASE || "https://api.openai.com/v1";
    const visionModel = env.AI_VISION_MODEL || env.AI_MODEL || "gpt-4o";
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI API \u672A\u914D\u7F6E"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const categories = await env.DB.prepare("SELECT name, type FROM categories").all();
    const categoryList = categories.results?.map((c) => `${c.name}(${c.type})`).join(", ") || "";
    const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u667A\u80FD\u8BB0\u8D26\u52A9\u624B\u3002\u5206\u6790\u56FE\u7247\u4E2D\u7684\u5C0F\u7968/\u53D1\u7968/\u8D26\u5355\uFF0C\u63D0\u53D6\u8D26\u76EE\u4FE1\u606F\u3002

\u53EF\u7528\u7684\u7C7B\u522B\u6709: ${categoryList}

\u8BF7\u4EE5JSON\u683C\u5F0F\u8FD4\u56DE\uFF0C\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5:
- type: "income" \u6216 "expense" (\u901A\u5E38\u662F expense)
- amount: \u603B\u91D1\u989D(\u6570\u5B57\uFF0C\u8BC6\u522B\u91D1\u989D/\u603B\u8BA1/\u5408\u8BA1\u7B49)
- category: \u7C7B\u522B\u540D\u79F0(\u4ECE\u53EF\u7528\u7C7B\u522B\u4E2D\u9009\u62E9\u6700\u5339\u914D\u7684)
- description: \u5546\u5BB6\u540D\u79F0\u6216\u8D2D\u4E70\u5185\u5BB9\u7684\u7B80\u77ED\u63CF\u8FF0
- date: \u65E5\u671F(YYYY-MM-DD\u683C\u5F0F\uFF0C\u4ECE\u7968\u636E\u4E2D\u8BC6\u522B\uFF0C\u5982\u679C\u65E0\u6CD5\u8BC6\u522B\u5219\u4F7F\u7528\u4ECA\u5929: ${today})
- items: \u53EF\u9009\uFF0C\u5546\u54C1\u660E\u7EC6\u6570\u7EC4

\u53EA\u8FD4\u56DEJSON\uFF0C\u4E0D\u8981\u6709\u5176\u4ED6\u5185\u5BB9\u3002\u5982\u679C\u56FE\u7247\u4E0D\u662F\u6709\u6548\u7684\u7968\u636E\u6216\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8FD4\u56DE {"error": "\u65E0\u6CD5\u8BC6\u522B\u56FE\u7247\u5185\u5BB9"}`;
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247\u4E2D\u7684\u8D26\u76EE\u4FE1\u606F" },
              {
                type: "image_url",
                image_url: {
                  url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1e3
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("AI Vision API error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "AI \u89C6\u89C9\u670D\u52A1\u8C03\u7528\u5931\u8D25"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI \u8FD4\u56DE\u4E3A\u7A7A"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      console.error("Parse error:", e, content);
      return new Response(JSON.stringify({
        success: false,
        error: "\u89E3\u6790AI\u54CD\u5E94\u5931\u8D25"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (parsed.error) {
      return new Response(JSON.stringify({
        success: false,
        error: parsed.error
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: parsed
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AI OCR error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u5904\u7406\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost2, "onRequestPost");

// api/ai/parse.js
async function onRequestPost3(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    if (!text) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u8BF7\u8F93\u5165\u6587\u672C"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const apiKey = env.AI_API_KEY;
    const apiBase = env.AI_API_BASE || "https://api.openai.com/v1";
    const model = env.AI_MODEL || "gpt-4o-mini";
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI API \u672A\u914D\u7F6E"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const categories = await env.DB.prepare("SELECT name, type FROM categories").all();
    const categoryList = categories.results?.map((c) => `${c.name}(${c.type})`).join(", ") || "";
    const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u667A\u80FD\u8BB0\u8D26\u52A9\u624B\u3002\u6839\u636E\u7528\u6237\u7684\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\uFF0C\u89E3\u6790\u51FA\u7ED3\u6784\u5316\u7684\u8D26\u76EE\u4FE1\u606F\u3002

\u53EF\u7528\u7684\u7C7B\u522B\u6709: ${categoryList}

\u8BF7\u4EE5JSON\u683C\u5F0F\u8FD4\u56DE\uFF0C\u5305\u542B\u4EE5\u4E0B\u5B57\u6BB5:
- type: "income" \u6216 "expense"
- amount: \u91D1\u989D(\u6570\u5B57)
- category: \u7C7B\u522B\u540D\u79F0(\u4ECE\u53EF\u7528\u7C7B\u522B\u4E2D\u9009\u62E9\u6700\u5339\u914D\u7684)
- description: \u7B80\u77ED\u63CF\u8FF0
- date: \u65E5\u671F(YYYY-MM-DD\u683C\u5F0F\uFF0C\u5982\u679C\u672A\u63D0\u53CA\u5219\u4F7F\u7528\u4ECA\u5929: ${today})

\u53EA\u8FD4\u56DEJSON\uFF0C\u4E0D\u8981\u6709\u5176\u4ED6\u5185\u5BB9\u3002\u5982\u679C\u65E0\u6CD5\u89E3\u6790\uFF0C\u8FD4\u56DE {"error": "\u65E0\u6CD5\u89E3\u6790"}`;
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("AI API error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "AI \u670D\u52A1\u8C03\u7528\u5931\u8D25"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI \u8FD4\u56DE\u4E3A\u7A7A"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      console.error("Parse error:", e, content);
      return new Response(JSON.stringify({
        success: false,
        error: "\u89E3\u6790AI\u54CD\u5E94\u5931\u8D25"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (parsed.error) {
      return new Response(JSON.stringify({
        success: false,
        error: parsed.error
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: parsed
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AI parse error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u5904\u7406\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost3, "onRequestPost");

// api/auth/login.js
async function onRequestPost4(context) {
  const { request, env } = context;
  try {
    const { username, password } = await request.json();
    const validUsername = env.AUTH_USERNAME || "admin";
    const validPassword = env.AUTH_PASSWORD || "admin123";
    const expiryHours = parseInt(env.SESSION_EXPIRY_HOURS || "24", 10);
    if (username !== validUsername || password !== validPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1e3).toISOString();
    await env.DB.prepare("DELETE FROM sessions WHERE username = ?").bind(username).run();
    await env.DB.prepare(
      "INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)"
    ).bind(sessionToken, username, expiresAt).run();
    const isSecure = request.url.startsWith("https://");
    const cookieOptions = [
      `session=${sessionToken}`,
      "Path=/",
      `Max-Age=${expiryHours * 60 * 60}`,
      "HttpOnly",
      "SameSite=Lax"
    ];
    if (isSecure) {
      cookieOptions.push("Secure");
    }
    return new Response(JSON.stringify({
      success: true,
      message: "\u767B\u5F55\u6210\u529F",
      expiresAt
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieOptions.join("; ")
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost4, "onRequestPost");

// api/auth/logout.js
async function onRequestPost5(context) {
  const { request, env } = context;
  try {
    const cookies = request.headers.get("Cookie") || "";
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;
    if (sessionToken) {
      await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionToken).run();
    }
    return new Response(JSON.stringify({
      success: true,
      message: "\u5DF2\u9000\u51FA\u767B\u5F55"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u9000\u51FA\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost5, "onRequestPost");

// api/auth/verify.js
async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const cookies = request.headers.get("Cookie") || "";
    const sessionMatch = cookies.match(/session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;
    if (!sessionToken) {
      return new Response(JSON.stringify({
        authenticated: false,
        reason: "no_session"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
    ).bind(sessionToken).first();
    if (!session) {
      return new Response(JSON.stringify({
        authenticated: false,
        reason: "session_expired"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"
        }
      });
    }
    return new Response(JSON.stringify({
      authenticated: true,
      username: session.username,
      expiresAt: session.expires_at
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Verify error:", error);
    return new Response(JSON.stringify({
      authenticated: false,
      error: "\u9A8C\u8BC1\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet, "onRequestGet");

// api/records/[id].js
async function onRequestGet2(context) {
  const { env, params } = context;
  const id = params.id;
  try {
    const record = await env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(id).first();
    if (!record) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u8BB0\u5F55\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: record
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get record error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u83B7\u53D6\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet2, "onRequestGet");
async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;
  try {
    const existing = await env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u8BB0\u5F55\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = await request.json();
    const { type, amount, category, description, date } = data;
    await env.DB.prepare(`
      UPDATE records 
      SET type = ?, amount = ?, category = ?, description = ?, date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      type || existing.type,
      amount !== void 0 ? parseFloat(amount) : existing.amount,
      category || existing.category,
      description !== void 0 ? description : existing.description,
      date || existing.date,
      id
    ).run();
    const record = await env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(id).first();
    return new Response(JSON.stringify({
      success: true,
      message: "\u8BB0\u5F55\u5DF2\u66F4\u65B0",
      data: record
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Update record error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u66F4\u65B0\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete(context) {
  const { env, params } = context;
  const id = params.id;
  try {
    const existing = await env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(id).first();
    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u8BB0\u5F55\u4E0D\u5B58\u5728"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare("DELETE FROM records WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({
      success: true,
      message: "\u8BB0\u5F55\u5DF2\u5220\u9664"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Delete record error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u5220\u9664\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestDelete, "onRequestDelete");

// api/categories/index.js
async function onRequestGet3(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  try {
    let query = "SELECT * FROM categories";
    const params = [];
    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }
    query += " ORDER BY type, name";
    const result = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u83B7\u53D6\u7C7B\u522B\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost6(context) {
  const { request, env } = context;
  try {
    const { name, type, icon, color } = await request.json();
    if (!name || !type) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5: name, type"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!["income", "expense"].includes(type)) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u65E0\u6548\u7684\u7C7B\u578B"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare(
      "INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)"
    ).bind(name, type, icon || "\u{1F4CC}", color || "#808080").run();
    return new Response(JSON.stringify({
      success: true,
      message: "\u7C7B\u522B\u5DF2\u521B\u5EFA"
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create category error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u521B\u5EFA\u7C7B\u522B\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost6, "onRequestPost");

// api/records/index.js
async function onRequestGet4(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  try {
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const type = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const offset = (page - 1) * limit;
    let whereClause = "1=1";
    const params = [];
    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }
    if (category) {
      whereClause += " AND category = ?";
      params.push(category);
    }
    if (startDate) {
      whereClause += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND date <= ?";
      params.push(endDate);
    }
    const countQuery = `SELECT COUNT(*) as total FROM records WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;
    const query = `
      SELECT * FROM records 
      WHERE ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    const records = await env.DB.prepare(query).bind(...params, limit, offset).all();
    return new Response(JSON.stringify({
      success: true,
      data: records.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get records error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u83B7\u53D6\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPost7(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const { type, amount, category, description, date } = data;
    if (!type || !amount || !category || !date) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5: type, amount, category, date"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!["income", "expense"].includes(type)) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u65E0\u6548\u7684\u7C7B\u578B\uFF0C\u5FC5\u987B\u662F income \u6216 expense"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const result = await env.DB.prepare(
      "INSERT INTO records (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)"
    ).bind(type, parseFloat(amount), category, description || "", date).run();
    const record = await env.DB.prepare(
      "SELECT * FROM records WHERE id = ?"
    ).bind(result.meta.last_row_id).first();
    return new Response(JSON.stringify({
      success: true,
      message: "\u8BB0\u5F55\u5DF2\u521B\u5EFA",
      data: record
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create record error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u521B\u5EFA\u8BB0\u5F55\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost7, "onRequestPost");

// api/stats/index.js
async function onRequestGet5(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  try {
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const groupBy = url.searchParams.get("groupBy") || "month";
    let whereClause = "1=1";
    const params = [];
    if (startDate) {
      whereClause += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND date <= ?";
      params.push(endDate);
    }
    const totals = await env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
        COUNT(*) as recordCount
      FROM records WHERE ${whereClause}
    `).bind(...params).first();
    const byCategory = await env.DB.prepare(`
      SELECT 
        category,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM records 
      WHERE ${whereClause}
      GROUP BY category, type
      ORDER BY total DESC
    `).bind(...params).all();
    let dateFormat;
    switch (groupBy) {
      case "day":
        dateFormat = "%Y-%m-%d";
        break;
      case "week":
        dateFormat = "%Y-W%W";
        break;
      case "year":
        dateFormat = "%Y";
        break;
      case "month":
      default:
        dateFormat = "%Y-%m";
    }
    const byPeriod = await env.DB.prepare(`
      SELECT 
        strftime('${dateFormat}', date) as period,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        COUNT(*) as count
      FROM records 
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `).bind(...params).all();
    const recentRecords = await env.DB.prepare(`
      SELECT * FROM records 
      WHERE ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `).bind(...params).all();
    const totalIncome = totals?.totalIncome || 0;
    const totalExpense = totals?.totalExpense || 0;
    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;
    const expenseCategories = [];
    const incomeCategories = [];
    for (const item of byCategory.results || []) {
      const categoryData = {
        category: item.category,
        total: item.total,
        count: item.count,
        percentage: 0
      };
      if (item.type === "expense") {
        categoryData.percentage = totalExpense > 0 ? (item.total / totalExpense * 100).toFixed(1) : 0;
        expenseCategories.push(categoryData);
      } else {
        categoryData.percentage = totalIncome > 0 ? (item.total / totalIncome * 100).toFixed(1) : 0;
        incomeCategories.push(categoryData);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpense,
          netBalance,
          savingsRate: parseFloat(savingsRate),
          recordCount: totals?.recordCount || 0
        },
        byCategory: {
          expense: expenseCategories,
          income: incomeCategories
        },
        byPeriod: (byPeriod.results || []).reverse(),
        recentRecords: recentRecords.results || []
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u83B7\u53D6\u7EDF\u8BA1\u6570\u636E\u5931\u8D25"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestGet5, "onRequestGet");

// _middleware.js
var PUBLIC_PATHS = ["/api/auth/login", "/api/auth/verify"];
async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (PUBLIC_PATHS.some((path) => url.pathname === path)) {
    return next();
  }
  if (!url.pathname.startsWith("/api/")) {
    return next();
  }
  const cookies = request.headers.get("Cookie") || "";
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "NO_SESSION" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
    ).bind(sessionToken).first();
    if (!session) {
      await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionToken).run();
      return new Response(JSON.stringify({ error: "Session expired", code: "SESSION_EXPIRED" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"
        }
      });
    }
    context.data = context.data || {};
    context.data.user = { username: session.username };
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return new Response(JSON.stringify({ error: "Authentication error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-Ah6ml3/functionsRoutes-0.5077670959415921.mjs
var routes = [
  {
    routePath: "/api/ai/analyze",
    mountPath: "/api/ai",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/ai/ocr",
    mountPath: "/api/ai",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/ai/parse",
    mountPath: "/api/ai",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/auth/verify",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/records/:id",
    mountPath: "/api/records",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/records/:id",
    mountPath: "/api/records",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/records/:id",
    mountPath: "/api/records",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api/categories",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/categories",
    mountPath: "/api/categories",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/records",
    mountPath: "/api/records",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/records",
    mountPath: "/api/records",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/stats",
    mountPath: "/api/stats",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-TtGR3L/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-TtGR3L/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.6317926331788046.mjs.map
