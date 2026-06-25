# Algorithms Used in AI-Powered Finance Manager

## 1. Core Logic
- **JWT-based user authentication**: Token generation, verification, and middleware protection for secure API access
- **Budget vs expense comparison**: Real-time calculation of spent amount vs budget limit with automatic budget status updates
- **Expense categorization**: Automatic categorization and aggregation of expenses by category for reporting and analysis

## 2. Reporting & Automation
- **Monthly income, expense & savings calculation**: Aggregation algorithms using MongoDB queries to compute total income, total expenses, and net savings for any given month
- **Transaction sorting by date**: Descending date-based sorting (newest first) for transactions, expenses, and reminders using MongoDB sort operations
- **Reminder and recurring payment handling**: Date-based algorithms for calculating days until due date, automatic reminder flag updates, and recurring payment date advancement using calendar calculations
- **Expense aggregation by category**: MongoDB aggregation pipeline ($group, $sum) to calculate total spending per category for monthly reports
- **Automatic transaction logging**: Event-driven transaction creation for all financial actions (budgets, expenses, income, reminders) maintaining complete audit trail

## 3. AI & Smart Features
- **AI-based financial advice generation**: Prompt engineering and JSON parsing algorithms to extract structured financial advice from Google Gemini AI API responses
- **OCR-based receipt data extraction**: Tesseract.js OCR algorithm with pattern matching (regex) to extract category, amount, and date from receipt images using text recognition and data extraction heuristics
