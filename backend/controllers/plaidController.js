const plaidClient = require("../config/plaidClient");
const Transaction = require("../models/Transaction");
const PlaidAccessToken = require("../models/PlaidAccessToken");
const Expense = require("../models/Expense");
const { encryptString, decryptString } = require("../utils/fieldCrypto");

// 1. Create Link Token
exports.createLinkToken = async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ message: "Invalid or missing user ID" });
  }

  try {
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: id.toString() },
      client_name: "Finance Manager",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: "http://localhost:5173/",
    });
    res.json({ link_token: tokenResponse.data.link_token });
  } catch (error) {
    console.error(
      "Plaid linkTokenCreate error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to create link token",
      error: error.response?.data,
    });
  }
};

// 2. Exchange Public Token
exports.exchangePublicToken = async (req, res) => {
  const { public_token, institution } = req.body;
  const response = await plaidClient.itemPublicTokenExchange({ public_token });

  await PlaidAccessToken.create({
    user: req.user._id,
    accessToken: encryptString(response.data.access_token),
    itemId: response.data.item_id,
    institutionName: institution,
  });

  res.json({ message: "Bank account linked successfully" });
};

exports.getTransactions = async (req, res) => {
  try {
    const accessDoc = await PlaidAccessToken.findOne({ user: req.user._id });
    if (!accessDoc) {
      return res.status(404).json({ message: "No linked account found" });
    }

    const now = new Date();
    const startDate = new Date(now.setMonth(now.getMonth() - 3))
      .toISOString()
      .split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    const plainToken = decryptString(accessDoc.accessToken);
    const response = await plaidClient.transactionsGet({
      access_token: plainToken,
      start_date: startDate,
      end_date: endDate,
    });

    const plaidTransactions = response.data.transactions;

    // Get existing transaction IDs to avoid duplicates
    const existingTransactionIds = new Set(
      (
        await Transaction.find({
          user: req.user._id,
          transaction_id: {
            $in: plaidTransactions.map((tx) => tx.transaction_id),
          },
        }).select("transaction_id")
      ).map((tx) => tx.transaction_id)
    );

    const newTransactions = plaidTransactions.filter(
      (tx) => !existingTransactionIds.has(tx.transaction_id)
    );

    // Insert new transactions and corresponding expenses
    for (const tx of newTransactions) {
      // Create transaction
      const newTx = await Transaction.create({
        user: req.user._id,
        transaction_id: tx.transaction_id, // Store Plaid's unique transaction_id
        name: tx.name,
        amount: tx.amount,
        category: tx.category,
        date: new Date(tx.date),
        payment_channel: tx.payment_channel,
        account_id: tx.account_id,
      });

      // Check for existing expense by transaction_id
      const existingExpense = await Expense.findOne({
        user: req.user._id,
        transaction_id: tx.transaction_id,
      });

      if (!existingExpense) {
        await Expense.create({
          user: req.user._id,
          transaction_id: tx.transaction_id, // Link expense to transaction
          amount: tx.amount,
          category: tx.category[0] || "Other",
          date: new Date(tx.date),
          description: tx.name,
        });
      }
    }

    // Fetch all user transactions, sorted by date
    const allUserTransactions = await Transaction.find({
      user: req.user._id,
    }).sort({ date: -1 });

    res.json(allUserTransactions);
  } catch (error) {
    console.error("Error fetching transactions and expenses:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch transactions", error: error.message });
  }
};