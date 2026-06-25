// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import Reports from "./pages/Reports";
import Advice from "./pages/Advice";
import Reminders from "./pages/Reminders";
import Investments from "./pages/premium/Investments";
import Planning from "./pages/premium/Planning";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { getToken } from "./services/authService";
import Profile from "./pages/Profile";
import Household from "./pages/Household";
import Income from "./pages/Income";
import MyTransactions from "./pages/MyTransactions";
import ForgotPassword from "./components/forgot-password/ForgotPassword";
import OtpVerification from "./components/forgot-password/OtpVerification";
import UpdatePassword from "./components/forgot-password/UpdatePassword";
import { MODE_ENV } from "./utils/envConfig";

// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const isTestMode = MODE_ENV === "test";

  if (!isTestMode) {
    console.log("dev mode");
    const token = getToken();
    return token ? children : <Navigate to="/signin" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/household"
          element={
            <ProtectedRoute>
              <Household />
            </ProtectedRoute>
          }
        />
        <Route
          path="/income"
          element={
            <ProtectedRoute>
              <Income />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <MyTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budget"
          element={
            <ProtectedRoute>
              <Budget />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/advice"
          element={
            <ProtectedRoute>
              <Advice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <Reminders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/premium/investments"
          element={
            <ProtectedRoute>
              <Investments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/premium/planning"
          element={
            <ProtectedRoute>
              <Planning />
            </ProtectedRoute>
          }
        />

        {/* Public Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OtpVerification />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Catch-all route */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
