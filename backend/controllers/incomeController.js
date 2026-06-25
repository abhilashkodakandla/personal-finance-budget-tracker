// controllers/incomeController.js
const Income = require("../models/Income");
const Transaction = require("../models/Transaction");

exports.createIncome = async (req, res) => {
  const { amount, category, description, month } = req.body; // month in "YYYY-MM" format

  try {
    // Validate input
    if (!amount || !category || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return res
        .status(400)
        .json({
          message: "Amount, category, and month (YYYY-MM) are required",
        });
    }

    // Check if income already exists for this user and month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const existingIncome = await Income.findOne({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (existingIncome) {
      return res
        .status(400)
        .json({ message: `Income already exists for ${month}` });
    }

    // Create new income entry
    const income = await Income.create({
      user: req.user._id,
      amount,
      category,
      description,
      date: startDate, // Set to first day of the month for consistency
    });

    // Log a transaction for this income (money inflow)
    try {
      await Transaction.create({
        user: req.user._id,
        transaction_id: `income_${income._id}_${Date.now()}`,
        name: category || "Income",
        amount: Number(amount),
        category: [category],
        date: startDate,
        payment_channel: "income",
        account_id: "income-manual",
      });
    } catch (e) {
      console.error("Failed to log income transaction:", e?.message || e);
    }

    res.status(201).json(income);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to create income", error: error.message });
  }
};

exports.updateIncome = async (req, res) => {
  const { amount, increaseBy, category, description, month } = req.body; // month in "YYYY-MM" format

  try {
    // Validate input
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Month (YYYY-MM) is required" });
    }
    if (!amount && !increaseBy) {
      return res
        .status(400)
        .json({ message: "Either amount or increaseBy must be provided" });
    }

    // Find income for the specified month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const income = await Income.findOne({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (!income) {
      return res.status(404).json({ message: `No income found for ${month}` });
    }

    // Update fields
    if (amount) {
      income.amount = amount; // Set new fixed amount
    } else if (increaseBy) {
      income.amount += increaseBy; // Increase by fixed amount
    }
    if (category) income.category = category;
    if (description) income.description = description;

    const updatedIncome = await income.save();

    res.json(updatedIncome);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to update income", error: error.message });
  }
};

// Optional: Get income for a specific month (useful for UI)
exports.getIncome = async (req, res) => {
  const { month } = req.query; // Format: "YYYY-MM"

  try {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Month (YYYY-MM) is required" });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const income = await Income.findOne({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (!income) {
      return res.status(404).json({ message: `No income found for ${month}` });
    }

    res.json(income);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch income", error: error.message });
  }
};

exports.deleteIncome = async (req, res) => {
  const { month } = req.query; // Format: "YYYY-MM"

  try {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const income = await Income.findOneAndDelete({
      user: req.user._id,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (!income) {
      return res.status(404).json({ message: `No income found for ${month}` });
    }

    res.status(200).json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete income', error: error.message });
  }
};