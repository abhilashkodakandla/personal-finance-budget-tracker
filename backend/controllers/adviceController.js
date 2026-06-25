const Goal = require("../models/Goal");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
require("dotenv").config();

async function generateGeminiText(prompt, generationConfig) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  // Use v1 (not v1beta). v1beta is what was causing 404s.
  const modelCandidates = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
  ];

  let lastErr;
  for (const model of modelCandidates) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`Gemini HTTP ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";
      if (!text) {
        throw new Error("Gemini returned empty response");
      }
      return text;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Gemini request failed");
}

function extractJsonArray(rawText) {
  // Handles responses with extra text / code fences
  const match = rawText.match(/\[\s*{[\s\S]*?}\s*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

function buildFallbackPredictions(expenses = [], budgets = []) {
  const byCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(e.amount || 0);
  });

  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (top.length === 0) {
    return [];
  }

  return top.map(([category, total], idx) => ({
    id: idx + 1,
    category,
    prediction: `${category} is one of your highest spending categories this period.`,
    advice: `Set a monthly cap and reduce ${category} spending by 10-15% to improve savings.`,
    priority: idx === 0 ? "High" : "Medium",
    expected_savings: Math.round(total * 0.1),
    color: ["#ef4444", "#f59e0b", "#3b82f6"][idx % 3],
  }));
}

exports.getAISuggestions = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id });
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(50);

    const prompt = `
      You are a financial advisor. Based on the following user data, provide 3-5 actionable financial suggestions to improve their financial health. Each suggestion should include:
      - Category (e.g., Savings, Spending)
      - Brief description (1 sentence)
      - Priority (High, Medium, Low)
      - Estimated impact (in dollars or percentage)
      - If applicable, link to a specific savings goal (include goal_id)

      User Data:
      Goals: ${JSON.stringify(
        goals.map((g) => ({
          goal_id: g._id,
          goal_name: g.goal_name,
          goal_amount: g.goal_amount,
          achieved_amount: g.achieved_amount,
        }))
      )}

      Recent Expenses: ${JSON.stringify(
        expenses.map((e) => ({
          amount: e.amount,
          category: e.category,
          date: e.date,
          description: e.description,
        }))
      )}

      Format the response as a JSON array of objects with fields: id, category, text, priority, impact_amount, action, goal_id, color.
    `;

    const rawText = await generateGeminiText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    const suggestions = extractJsonArray(rawText);
    if (suggestions.length > 0) {
      return res.json(suggestions);
    }

    // Fallback suggestions when model response is unparsable
    return res.json([
      {
        id: 1,
        category: "Savings",
        text: "Try saving at least 20% of your monthly income before discretionary spending.",
        priority: "High",
        impact_amount: 0,
        action: "Automate transfers to a savings goal every month.",
        goal_id: null,
        color: "#10b981",
      },
      {
        id: 2,
        category: "Spending",
        text: "Review top expense categories and set tighter limits for non-essential spend.",
        priority: "Medium",
        impact_amount: 0,
        action: "Reduce one high-spend category by 10-15% this month.",
        goal_id: null,
        color: "#f59e0b",
      },
    ]);
  } catch (err) {
    console.error("AI Suggestions error:", err);
    // Graceful fallback so UI still works even if Gemini is down
    res.json([
      {
        id: 1,
        category: "Savings",
        text: "Track daily expenses and prioritize needs over wants for this month.",
        priority: "High",
        impact_amount: 0,
        action: "Review expenses weekly and adjust budget caps.",
        goal_id: null,
        color: "#10b981",
      },
    ]);
  }
};

exports.predictAndAdviseExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id });
    const budgets = await Budget.find({ user: req.user._id });

    if (expenses.length <= 2 || budgets.length <= 1) {
      return res.status(200).json({
        message: "Not enough expense or budget data to provide predictions.",
      });
    }

    const prompt = `
      You are a financial analyst AI. Analyze the user's budget and expense data to:
      - Predict which categories the user is likely to continue spending in.
      - Identify any budget categories where spending consistently exceeds the limit.
      - Provide 3-5 suggestions on how the user can reduce or optimize their spending.
      
      Format for each suggestion:
      {
        id: number,
        category: string,
        prediction: string,
        advice: string,
        priority: string,
        expected_savings: number,
        color: string
      }

      Budgets: ${JSON.stringify(
        budgets.map((b) => ({
          category: b.category,
          limit: b.limit,
          spent: b.spent,
          month: b.month,
        }))
      )}

      Expenses: ${JSON.stringify(
        expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          date: e.date,
        }))
      )}
    `;

    const rawText = await generateGeminiText(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1000,
    });

    const predictions = extractJsonArray(rawText);
    if (predictions.length > 0) {
      return res.json(predictions);
    }

    // Fallback predictions if response format isn't parsable
    return res.json(buildFallbackPredictions(expenses, budgets));
  } catch (err) {
    console.error("Prediction error:", err);
    // Graceful fallback for runtime/API failures
    const expenses = await Expense.find({ user: req.user._id });
    const budgets = await Budget.find({ user: req.user._id });
    return res.json(buildFallbackPredictions(expenses, budgets));
  }
};