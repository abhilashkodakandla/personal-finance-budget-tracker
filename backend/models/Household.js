const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      required: true,
    },
    permissions: {
      canViewBudgets: { type: Boolean, default: true },
      canEditBudgets: { type: Boolean, default: false },
      canViewTransactions: { type: Boolean, default: true },
      canEditTransactions: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false },
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const householdSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Household", householdSchema);
