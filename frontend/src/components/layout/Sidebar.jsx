import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FaChartPie,
  FaDollarSign,
  FaBell,
  FaHome,
  FaWallet,
  FaLightbulb,
  FaUsers,
} from "react-icons/fa";
import { getReminders } from "../../services/reminderService";

const Sidebar = () => {
  const [hasUnpaidReminders, setHasUnpaidReminders] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const reminders = await getReminders();
        const unpaid = reminders.some((reminder) => reminder.remind);
        setHasUnpaidReminders(unpaid);
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      }
    };

    fetchReminders();

    const handleReminderUpdate = () => {
      fetchReminders();
    };

    window.addEventListener("reminder-updated", handleReminderUpdate);

    return () => {
      window.removeEventListener("reminder-updated", handleReminderUpdate);
    };
  }, []);

  return (
    <aside className="w-64 bg-finance-neutral h-screen p-6 shadow-lg flex flex-col">
      {/* Navigation Links */}
      <ul className="space-y-4 flex-1">
        <SidebarItem to="/" icon={<FaHome />} label="Dashboard" />
        <SidebarItem to="/household" icon={<FaUsers />} label="Household" />
        <SidebarItem to="/budget" icon={<FaWallet />} label="Budget Tracker" />
        <SidebarItem
          to="/premium/investments"
          icon={<FaDollarSign />}
          label="Investments"
        />
        <SidebarItem
          to="/reminders"
          icon={<BellWithBadge hasAlert={hasUnpaidReminders} />}
          label="Bill Reminders"
        />
        <SidebarItem
          to="/reports"
          icon={<FaChartPie />}
          label="Reports & Analytics"
        />
        <SidebarItem
          to="/advice"
          icon={<FaLightbulb />}
          label="Financial Advice"
        />
      </ul>
    </aside>
  );
};

// Sidebar Item Component
const SidebarItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
        isActive
          ? "bg-finance-primary text-white font-semibold"
          : "text-finance-dark hover:bg-finance-light hover:text-finance-primary"
      }`
    }
  >
    <span className="text-lg relative">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

// Icon with Notification Dot
const BellWithBadge = ({ hasAlert }) => (
  <span className="relative inline-block">
    <FaBell />
    {hasAlert && (
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
    )}
  </span>
);

export default Sidebar;
