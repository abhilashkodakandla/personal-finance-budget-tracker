const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transaction = require("../models/Transaction");

exports.getBudgets = async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id });
  res.json(budgets);
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).sort({
      date: -1,
    }); // Sort by date descending (newest first)
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

exports.createBudget = async (req, res) => {
  const { category, limit, month } = req.body;

  const budget = await Budget.create({
    user: req.user._id,
    category,
    limit,
    month,
  });

  // Log a neutral transaction so history reflects the budget creation
  try {
    await Transaction.create({
      user: req.user._id,
      transaction_id: `budget_${budget._id}_${Date.now()}`,
      name: `Budget set for ${category}`,
      amount: 0, // no money movement, just configuration
      category: [category],
      date: new Date(`${month || new Date().toISOString().slice(0, 7)}-01`),
      payment_channel: "budget",
      account_id: "budget-config",
    });
  } catch (e) {
    console.error("Failed to log budget transaction:", e?.message || e);
  }

  res.status(201).json(budget);
};

exports.addExpense = async (req, res) => {
  const { category, amount, description, date } = req.body;
  const randomTransactionId = Math.random().toString(36).substr(2, 9);

  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const expense = await Expense.create({
      user: req.user._id,
      category,
      amount: parseFloat(amount),
      description,
      date: date ? new Date(date) : new Date(),
      transaction_id: randomTransactionId,
    });

    // Log a transaction for this expense (money outflow)
    try {
      await Transaction.create({
        user: req.user._id,
        transaction_id: randomTransactionId,
        name: description || category || "Expense",
        amount: -Math.abs(parseFloat(amount)), // outflow as negative
        category: [category],
        date: expense.date,
        payment_channel: "expense",
        account_id: "expense-manual",
      });
    } catch (e) {
      console.error("Failed to log expense transaction:", e?.message || e);
    }

    const expenseDate = new Date(expense.date);
    const expenseMonth = expenseDate.toISOString().slice(0, 7);

    const budget = await Budget.findOne({
      user: req.user._id,
      category,
      month: expenseMonth,
    });

    if (budget) {
      // Recalculate total spent for that category and month
      const monthStart = new Date(`${expenseMonth}-01`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const totalSpent = await Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            category,
            date: { $gte: monthStart, $lt: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      budget.spent = totalSpent[0]?.total || 0;
      await budget.save();

      if (budget.alertsEnabled && budget.spent > budget.limit) {
        console.log(
          `⚠ Alert: Budget exceeded for ${category} in ${expenseMonth}`
        );
      }
    }

    res.status(201).json({ expense, updatedBudget: budget });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ message: "Failed to add expense" });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete budget" });
  }
};
exports.updateBudget = async (req, res) => {
  try {
    const updated = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update budget" });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { month } = req.query; // Format: "2025-04"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res
        .status(400)
        .json({ message: "Invalid month format. Use YYYY-MM" });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Fetch expenses
    const expenses = await Expense.find({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    // Fetch income
    const income = await Income.findOne({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = income ? income.amount : 0;
    const netSavings = totalIncome - totalExpenses;

    const expenseByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    res.json({
      month,
      totalIncome,
      totalExpenses,
      netSavings,
      expenseByCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate monthly summary" });
  }
};

exports.getSpendingByCategory = async (req, res) => {
  try {
    const { month } = req.query;

    const start = new Date(`${month}-01`);
    const end = new Date(`${month}-31`);

    const expenses = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch spending by category" });
  }
};

exports.getBudgetVsActual = async (req, res) => {
  try {
    const { month } = req.query;

    const budgets = await Budget.find({ user: req.user._id, month });
    const expenses = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(`${month}-01`),
            $lte: new Date(`${month}-31`),
          },
        },
      },
      {
        $group: {
          _id: "$category",
          totalSpent: { $sum: "$amount" },
        },
      },
    ]);

    const expenseMap = {};
    expenses.forEach((e) => {
      expenseMap[e._id] = e.totalSpent;
    });

    const result = budgets.map((b) => ({
      category: b.category,
      budget: b.limit,
      actual: expenseMap[b.category] || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate budget vs actual" });
  }
};

exports.getTopExpenses = async (req, res) => {
  try {
    const { month, limit = 5 } = req.query;

    const expenses = await Expense.find({
      user: req.user._id,
      date: {
        $gte: new Date(`${month}-01`),
        $lte: new Date(`${month}-31`),
      },
    })
      .sort({ amount: -1 })
      .limit(parseInt(limit));

    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch top expenses" });
  }
};
