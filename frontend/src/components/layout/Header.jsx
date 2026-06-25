import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import logo from "../../assets/logo.png";
import { logout } from "../../services/authService";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Call the logout function from authService
    navigate("/signin"); // Redirect to signin route
    setIsOpen(false); // Close the dropdown
  };

  return (
    <header className="bg-finance-secondary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo linking to Dashboard */}
        <NavLink to="/">
          <img src={logo} alt="logo" className="w-[150px] cursor-pointer" />
        </NavLink>

        {/* Profile Icon with Dropdown */}
        <div className="relative flex items-center">
          <FaUserCircle
            className="text-3xl text-black cursor-pointer hover:text-finance-accent"
            onClick={() => setIsOpen(!isOpen)}
          />

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 top-full">
               <button
                onClick={()=>navigate("/profile")}
                className="block w-full text-left px-4 py-2 m-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profile
              </button>
              <button
                onClick={()=>navigate("/household")}
                className="block w-full text-left px-4 py-2 m-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Household
              </button>
              <button
                onClick={()=>navigate("/transactions")}
                className="block w-full text-left px-4 py-2 m-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Transactions from Bank
              </button>
              <button
                onClick={()=>navigate("/income")}
                className="block w-full text-left px-4 py-2 m-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                My Incomes
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 m-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
