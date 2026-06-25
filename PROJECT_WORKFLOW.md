# AI-Powered Finance Manager - Complete Project Workflow

## 10-Point Workflow Summary

1. **User Authentication**: Users register/login via web or mobile app, JWT tokens stored in localStorage (web) or AsyncStorage (mobile) for session management.

2. **Data Entry**: Users input financial data through forms - budgets (category, limit, month), expenses (category, amount, date), income (source, amount, month), reminders (name, amount, due date), goals, and investments.

3. **Data Storage**: All financial data is stored in MongoDB with user-specific collections (Budgets, Expenses, Income, Reminders, Goals, Investments, Transactions) using Mongoose ODM.

4. **Automatic Transaction Logging**: Backend automatically creates Transaction entries whenever budgets, expenses, income, or reminders are created/updated, maintaining a complete financial ledger.

5. **Budget Tracking**: When expenses are added, backend automatically updates the corresponding budget's `spent` field by aggregating expenses for that category and month, enabling real-time budget monitoring.

6. **AI Analysis**: Backend fetches user's budgets, expenses, goals, and income data, formats it into prompts, and sends to Google Gemini AI API (v1 REST) for financial predictions and personalized advice.

7. **AI Response Processing**: Gemini returns JSON-formatted suggestions/predictions which are parsed, validated, and returned to frontend/mobile app for display in Dashboard and Advice sections.

8. **Data Aggregation**: Backend aggregates expenses by category, calculates monthly summaries (total income, total expenses, net savings), and provides spending patterns for Reports visualization.

9. **Visualization**: Frontend/mobile displays data using Chart.js (web) and react-native-chart-kit (mobile) - pie charts for expense categories, bar charts for top expenses, line charts for investments.

10. **Real-time Updates**: Both web and mobile apps support pull-to-refresh, and data automatically syncs between platforms since they share the same MongoDB database and REST API endpoints.
