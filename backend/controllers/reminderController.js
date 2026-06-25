const Reminder = require("../models/Reminder");
const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");

// Create a new reminder
exports.createReminder = async (req, res) => {
  const { name, description, dueDate, amount, reminderInterval } = req.body;

  try {
    const reminder = await Reminder.create({
      user: req.user._id,
      name,
      description,
      dueDate: new Date(dueDate),
      amount,
      reminderInterval,
      nextReminderDate: new Date(dueDate),
    });

    // Optional: log a neutral transaction for reminder creation (configuration event)
    try {
      await Transaction.create({
        user: req.user._id,
        transaction_id: `reminder_${reminder._id}_${Date.now()}`,
        name: `Reminder set: ${name}`,
        amount: 0,
        category: [name],
        date: new Date(dueDate),
        payment_channel: "reminder",
        account_id: "reminder-config",
      });
    } catch (e) {
      console.error("Failed to log reminder transaction:", e?.message || e);
    }

    res.status(201).json(reminder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create reminder" });
  }
};

// Get all reminders for a user
exports.getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.user._id })
      .sort({ dueDate: 1 });

    // Update remind status based on due date proximity
    const now = new Date();
    for (let reminder of reminders) {
      const daysUntilDue = Math.ceil((reminder.dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Set remind true if within 1 day and not paid
      if (daysUntilDue <= 1 && !reminder.paid) {
        reminder.remind = true;
      } else if (reminder.paid) {
        reminder.remind = false;
      }
      await reminder.save();
    }

    res.json(reminders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch reminders" });
  }
};

// Update reminder (e.g., mark as paid)
const randomTransactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
exports.updateReminder = async (req, res) => {
  const { paid } = req.body;

  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.paid = paid !== undefined ? paid : reminder.paid;

    if (paid === true && reminder.recurrence) {
      // Add expense when paid
      const expense = await Expense.create({
        user: req.user._id,
        category: reminder.name,  // Use reminder name as expense category
        amount: reminder.amount,
        description: reminder.description || `Payment for ${reminder.name}`,
        date: new Date(),
        transaction_id: randomTransactionId,
      });

      // Log a transaction for this payment (outflow)
      try {
        await Transaction.create({
          user: req.user._id,
          transaction_id: randomTransactionId,
          name: reminder.name,
          amount: -Math.abs(reminder.amount),
          category: [reminder.name],
          date: expense.date,
          payment_channel: "reminder",
          account_id: "reminder-payment",
        });
      } catch (e) {
        console.error("Failed to log reminder payment transaction:", e?.message || e);
      }

      // Reset for next cycle
      reminder.paid = false;
      reminder.remind = false;
      const nextDueDate = new Date(reminder.nextReminderDate);
      nextDueDate.setDate(nextDueDate.getDate() + reminder.reminderInterval);
      reminder.dueDate = nextDueDate;
      reminder.nextReminderDate = nextDueDate;
    } else if (paid === true && !reminder.recurrence) {
      // For non-recurring reminders, mark as paid and log a one-time transaction
      reminder.remind = false;

      try {
        await Transaction.create({
          user: req.user._id,
          transaction_id: `reminder_pay_${reminder._id}_${Date.now()}`,
          name: reminder.name,
          amount: -Math.abs(reminder.amount),
          category: [reminder.name],
          date: new Date(),
          payment_channel: "reminder",
          account_id: "reminder-payment",
        });
      } catch (e) {
        console.error("Failed to log non-recurring reminder payment transaction:", e?.message || e);
      }
    }

    await reminder.save();
    res.json(reminder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update reminder" });
  }
};

// Delete reminder
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.status(200).json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete reminder" });
  }
};