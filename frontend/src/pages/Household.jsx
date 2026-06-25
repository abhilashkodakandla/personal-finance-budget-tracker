import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import {
  FaHome,
  FaPlusCircle,
  FaTrash,
  FaSignOutAlt,
  FaUserPlus,
  FaExchangeAlt,
} from "react-icons/fa";
import { getCurrentUser } from "../services/authService";
import {
  getHouseholds,
  createHousehold,
  deleteHousehold,
  addHouseholdMember,
  updateHouseholdMember,
  removeHouseholdMember,
  leaveHousehold,
  transferHouseholdOwnership,
} from "../services/householdService";

const Household = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");
  const me = getCurrentUser();

  const load = async () => {
    setError("");
    try {
      const data = await getHouseholds();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Could not load households.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const myId = me?._id;

  const roleOf = (h) => {
    const m = (h.members || []).find((x) => {
      const id = x.user?._id || x.user;
      return id && String(id) === String(myId);
    });
    return m?.role;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await createHousehold({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create household");
    }
  };

  const handleAddMember = async (householdId) => {
    if (!inviteEmail.trim()) return;
    setError("");
    try {
      await addHouseholdMember(householdId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (householdId, userId) => {
    if (!window.confirm("Remove this member?")) return;
    setError("");
    try {
      await removeHouseholdMember(householdId, userId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeave = async (householdId) => {
    if (!window.confirm("Leave this household?")) return;
    setError("");
    try {
      await leaveHousehold(householdId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave");
    }
  };

  const handleDelete = async (householdId) => {
    if (!window.confirm("Delete this household permanently?")) return;
    setError("");
    try {
      await deleteHousehold(householdId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleTransfer = async (householdId) => {
    const uid = window.prompt("Enter user id of the new owner (from member list):");
    if (!uid?.trim()) return;
    setError("");
    try {
      await transferHouseholdOwnership(householdId, uid.trim());
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Transfer failed");
    }
  };

  const handleRoleChange = async (householdId, userId, role) => {
    setError("");
    try {
      await updateHouseholdMember(householdId, userId, { role });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role");
    }
  };

  if (loading) {
    return (
      <Layout>
        <p className="text-finance-dark">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl text-finance-dark font-bold mb-2 flex items-center gap-2">
        <FaHome className="text-finance-primary" /> Households
      </h1>
      <p className="text-finance-dark/80 mb-6 max-w-2xl">
        Create a household and invite other registered users by email. Permissions control future
        shared features; your existing budgets and transactions stay private to your account unless
        you later link them to a household.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded border border-red-200">{error}</div>
      )}

      <form
        onSubmit={handleCreate}
        className="p-6 bg-white rounded-lg shadow-md mb-8 flex flex-wrap gap-4 items-end"
      >
        <div>
          <label className="block text-sm text-finance-dark mb-1">New household name</label>
          <input
            className="border rounded px-3 py-2 min-w-[240px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith family"
          />
        </div>
        <button
          type="submit"
          className="flex items-center bg-finance-primary text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          <FaPlusCircle className="mr-2" /> Create
        </button>
      </form>

      <div className="space-y-6">
        {list.length === 0 ? (
          <p className="text-finance-dark/70">No households yet. Create one above.</p>
        ) : (
          list.map((h) => {
            const open = expandedId === h._id;
            const r = roleOf(h);
            const isOwner = String(h.owner?._id || h.owner) === String(myId);
            const canManage = r === "owner" || r === "admin";

            return (
              <div key={h._id} className="p-6 bg-white rounded-lg shadow-md">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-finance-dark">{h.name}</h2>
                    <p className="text-sm text-finance-dark/60">
                      Your role: <strong>{r || "member"}</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-sm px-3 py-1 rounded border border-finance-primary text-finance-primary"
                      onClick={() => setExpandedId(open ? null : h._id)}
                    >
                      {open ? "Hide" : "Members"}
                    </button>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          className="text-sm px-3 py-1 rounded border flex items-center gap-1"
                          onClick={() => handleTransfer(h._id)}
                          title="Transfer ownership"
                        >
                          <FaExchangeAlt /> Transfer
                        </button>
                        <button
                          type="button"
                          className="text-sm px-3 py-1 rounded border border-red-300 text-red-700 flex items-center gap-1"
                          onClick={() => handleDelete(h._id)}
                        >
                          <FaTrash /> Delete
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="text-sm px-3 py-1 rounded border flex items-center gap-1"
                      onClick={() => handleLeave(h._id)}
                    >
                      <FaSignOutAlt /> Leave
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-6 border-t pt-4">
                    <h3 className="font-semibold text-finance-dark mb-3">Members</h3>
                    <ul className="space-y-2 mb-6">
                      {(h.members || []).map((m) => {
                        const uid = m.user?._id || m.user;
                        const label = m.user?.name || m.user?.email || uid;
                        return (
                          <li
                            key={m._id || uid}
                            className="flex flex-wrap items-center gap-2 justify-between border-b border-gray-100 pb-2"
                          >
                            <span>
                              {label}{" "}
                              <span className="text-sm text-finance-dark/50">({m.role})</span>
                            </span>
                            {canManage && m.role !== "owner" && uid !== myId && (
                              <span className="flex gap-2 items-center">
                                <select
                                  className="border rounded text-sm px-2 py-1"
                                  value={m.role}
                                  onChange={(e) => handleRoleChange(h._id, uid, e.target.value)}
                                >
                                  <option value="admin">admin</option>
                                  <option value="member">member</option>
                                </select>
                                <button
                                  type="button"
                                  className="text-red-600 text-sm"
                                  onClick={() => handleRemoveMember(h._id, uid)}
                                >
                                  Remove
                                </button>
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {canManage && (
                      <div className="flex flex-wrap gap-3 items-end bg-finance-light/30 p-4 rounded">
                        <div>
                          <label className="block text-xs text-finance-dark mb-1">Email (registered user)</label>
                          <input
                            className="border rounded px-3 py-2"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="friend@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-finance-dark mb-1">Role</label>
                          <select
                            className="border rounded px-3 py-2"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="flex items-center bg-finance-secondary text-white px-4 py-2 rounded-lg"
                          onClick={() => handleAddMember(h._id)}
                        >
                          <FaUserPlus className="mr-2" /> Invite
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
};

export default Household;
