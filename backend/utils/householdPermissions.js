function defaultPermissionsForRole(role) {
  if (role === "owner" || role === "admin") {
    return {
      canViewBudgets: true,
      canEditBudgets: true,
      canViewTransactions: true,
      canEditTransactions: true,
      canManageMembers: true,
    };
  }
  return {
    canViewBudgets: true,
    canEditBudgets: false,
    canViewTransactions: true,
    canEditTransactions: false,
    canManageMembers: false,
  };
}

module.exports = { defaultPermissionsForRole };
