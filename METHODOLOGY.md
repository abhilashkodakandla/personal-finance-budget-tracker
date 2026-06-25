# Project Methodology - AI-Powered Finance Manager

## 1. Data Collection
Users register/login through web interface or mobile app (React Native with Expo).
Users enter income, expenses, budgets, savings goals, reminders, and investments through intuitive forms.
Each transaction includes amount, category, date, description, and type (income/expense/budget).
Data is securely stored in MongoDB database with user authentication via JWT tokens.
All financial actions (budget creation, expense addition, income entry, reminder payments) automatically generate Transaction entries for complete audit trail.

## 2. Data Pre-Processing
Collected data is validated and structured using Mongoose schemas with required fields and data types.
Expenses are automatically categorized and aggregated month-wise when budgets are updated.
Backend extracts features such as monthly income totals, expense totals by category, budget vs actual spending, and spending patterns.
Data is normalized and prepared for AI analysis by formatting user's financial history into structured JSON prompts.

## 3. AI-Powered Analysis (Not Traditional ML)
Google Gemini AI API (LLM-based) is used instead of traditional machine learning models.
The system sends user's financial data (budgets, expenses, goals, income) as context to Gemini API via REST endpoints.
Gemini AI analyzes spending patterns, budget adherence, and financial goals to generate:
- Predictions for future spending categories
- Personalized financial advice and recommendations
- Expected savings opportunities
- Budget optimization suggestions
AI responses are parsed from JSON format and displayed in Dashboard and Advice sections.

## 4. System Integration
Backend (Node.js + Express) directly calls Google Gemini AI API using REST endpoints (v1 API).
No separate ML microservice - AI integration is built into Express controllers (adviceController.js).
AI predictions are returned via `/api/advice/suggestions` and `/api/advice/predict` endpoints.
Predictions are refreshed in real-time whenever users access Dashboard or Advice tabs (no pre-storage).

## 5. Visualization & User Feedback
Results are displayed using interactive dashboards with Chart.js (web) and react-native-chart-kit (mobile).
Users receive:
- Budget summary cards showing remaining budget and monthly net savings
- Visual progress bars indicating budget utilization
- Expense category pie charts and top expenses bar charts
- AI insights with priority-based recommendations and expected savings
- Upcoming bill reminders with due dates
- Monthly summary reports with income, expenses, and net savings
Users can view detailed reports filtered by month (YYYY-MM format).

## 6. Security & Deployment
JWT-based authentication ensures secure user sessions (tokens stored in localStorage/AsyncStorage).
MongoDB stores user data with user-specific queries (all queries filtered by req.user._id).
Application currently runs in local development environment:
- Backend: Node.js/Express on port 4000
- Frontend Web: Vite dev server
- Mobile: Expo development server with Expo Go app
System supports both web and mobile platforms sharing the same backend API and database.
Future deployment can be on cloud platforms (AWS, Heroku, Render) with MongoDB Atlas for production database.
