const mongoose = require("mongoose");
const Household = require("../models/Household");
const User = require("../models/User");
const { defaultPermissionsForRole } = require("../utils/householdPermissions");

function memberEntry(userId, role) {
  return {
    user: userId,
    role,
    permissions: defaultPermissionsForRole(role),
  };
}

function findMember(household, userId) {
  const uid = userId.toString();
  return household.members.find((m) => m.user.toString() === uid);
}

function serializeHousehold(h) {
  const o = h.toObject ? h.toObject() : h;
  return {
    ...o,
    members: (o.members || []).map((m) => ({
      _id: m._id,
      user: m.user,
      role: m.role,
      permissions: m.permissions,
      joinedAt: m.joinedAt,
    })),
  };
}

exports.listHouseholds = async (req, res) => {
  try {
    const list = await Household.find({
      "members.user": req.user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ updatedAt: -1 });

    res.json(list.map(serializeHousehold));
  } catch (err) {
    res.status(500).json({ message: "Failed to list households", error: err.message });
  }
};

exports.createHousehold = async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Household name is required" });
  }

  try {
    const household = await Household.create({
      name: name.trim(),
      owner: req.user._id,
      members: [memberEntry(req.user._id, "owner")],
    });
    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.status(201).json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to create household", error: err.message });
  }
};

exports.getHousehold = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid household id" });
  }

  try {
    const household = await Household.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    if (!findMember(household, req.user._id)) {
      return res.status(403).json({ message: "Not a member of this household" });
    }

    res.json(serializeHousehold(household));
  } catch (err) {
    res.status(500).json({ message: "Failed to load household", error: err.message });
  }
};

exports.updateHousehold = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid household id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    const me = findMember(household, req.user._id);
    if (!me || !me.permissions.canManageMembers) {
      return res.status(403).json({ message: "Not allowed to update this household" });
    }

    if (name != null && typeof name === "string" && name.trim()) {
      household.name = name.trim();
    }

    await household.save();
    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to update household", error: err.message });
  }
};

exports.deleteHousehold = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid household id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    if (household.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the owner can delete the household" });
    }

    await household.deleteOne();
    res.json({ message: "Household deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete household", error: err.message });
  }
};

exports.addMember = async (req, res) => {
  const { id } = req.params;
  const { email, role = "member" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid household id" });
  }

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "email is required" });
  }

  const allowedRoles = ["admin", "member"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "role must be admin or member when inviting" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    const me = findMember(household, req.user._id);
    if (!me || !me.permissions.canManageMembers) {
      return res.status(403).json({ message: "Not allowed to add members" });
    }

    const userToAdd = await User.findOne({ email: email.trim().toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ message: "No user registered with that email" });
    }

    if (findMember(household, userToAdd._id)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    household.members.push(memberEntry(userToAdd._id, role));
    await household.save();

    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.status(201).json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to add member", error: err.message });
  }
};

exports.updateMember = async (req, res) => {
  const { id, userId } = req.params;
  const { role, permissions } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    const me = findMember(household, req.user._id);
    if (!me || !me.permissions.canManageMembers) {
      return res.status(403).json({ message: "Not allowed to update members" });
    }

    const target = findMember(household, userId);
    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (target.role === "owner") {
      return res.status(400).json({ message: "Use ownership transfer instead of changing owner role" });
    }

    if (role && ["admin", "member"].includes(role)) {
      target.role = role;
      target.permissions = permissions && typeof permissions === "object"
        ? { ...defaultPermissionsForRole(role), ...permissions }
        : defaultPermissionsForRole(role);
    } else if (permissions && typeof permissions === "object") {
      target.permissions = { ...target.permissions, ...permissions };
    }

    await household.save();

    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to update member", error: err.message });
  }
};

exports.removeMember = async (req, res) => {
  const { id, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    const me = findMember(household, req.user._id);
    const target = findMember(household, userId);
    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    const isSelf = userId === req.user._id.toString();
    const canManage = me && me.permissions.canManageMembers;

    if (!isSelf && !canManage) {
      return res.status(403).json({ message: "Not allowed to remove this member" });
    }

    if (isSelf && target.role === "owner") {
      return res.status(400).json({ message: "Owner cannot leave without transferring ownership first" });
    }

    if (!isSelf && target.role === "owner") {
      return res.status(400).json({ message: "Cannot remove the owner" });
    }

    household.members = household.members.filter((m) => m.user.toString() !== userId);

    await household.save();

    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to remove member", error: err.message });
  }
};

exports.transferOwnership = async (req, res) => {
  const { id } = req.params;
  const { newOwnerId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(newOwnerId)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    if (household.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the owner can transfer ownership" });
    }

    const newOwner = findMember(household, newOwnerId);
    if (!newOwner) {
      return res.status(404).json({ message: "New owner must be an existing member" });
    }

    const prevOwnerId = req.user._id.toString();

    household.members.forEach((m) => {
      if (m.user.toString() === prevOwnerId) {
        m.role = "admin";
        m.permissions = defaultPermissionsForRole("admin");
      }
      if (m.user.toString() === newOwnerId.toString()) {
        m.role = "owner";
        m.permissions = defaultPermissionsForRole("owner");
      }
    });

    household.owner = newOwnerId;
    await household.save();

    const populated = await Household.findById(household._id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    res.json(serializeHousehold(populated));
  } catch (err) {
    res.status(500).json({ message: "Failed to transfer ownership", error: err.message });
  }
};

exports.leaveHousehold = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid household id" });
  }

  try {
    const household = await Household.findById(id);
    if (!household) {
      return res.status(404).json({ message: "Household not found" });
    }

    const me = findMember(household, req.user._id);
    if (!me) {
      return res.status(403).json({ message: "Not a member" });
    }

    if (me.role === "owner") {
      const others = household.members.filter((m) => m.user.toString() !== req.user._id.toString());
      if (others.length === 0) {
        await household.deleteOne();
        return res.json({ message: "Household deleted (you were the only member)" });
      }
      const nextAdmin = others.find((m) => m.role === "admin") || others[0];
      nextAdmin.role = "owner";
      nextAdmin.permissions = defaultPermissionsForRole("owner");
      household.owner = nextAdmin.user;
      household.members = household.members.filter((m) => m.user.toString() !== req.user._id.toString());
      await household.save();
      return res.json({ message: "Left household; ownership transferred" });
    }

    household.members = household.members.filter((m) => m.user.toString() !== req.user._id.toString());
    await household.save();

    res.json({ message: "Left household" });
  } catch (err) {
    res.status(500).json({ message: "Failed to leave household", error: err.message });
  }
};
