const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/budgets", require("./routes/budgetRoutes"));
app.use("/api/reminders", require("./routes/reminderRoutes"));
app.use("/api/investments", require("./routes/investmentRoute"));
app.use('/api/income', require('./routes/incomeRoutes'));
app.use("/api/plaid", require("./routes/plaidRoutes"));
app.use("/api/goals", require("./routes/goalRoutes"));
app.use("/api/advice", require("./routes/adviceRoutes"));
app.use("/api/households", require("./routes/householdRoutes"));
app.use("/api/test", require("./routes/testRoute"));

app.use(errorHandler);
module.exports = app;
