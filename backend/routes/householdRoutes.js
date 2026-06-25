const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/householdController");

router.route("/").get(protect, ctrl.listHouseholds).post(protect, ctrl.createHousehold);

router.post("/:id/leave", protect, ctrl.leaveHousehold);
router.post("/:id/transfer-ownership", protect, ctrl.transferOwnership);

router.route("/:id/members").post(protect, ctrl.addMember);

router.patch("/:id/members/:userId", protect, ctrl.updateMember);
router.delete("/:id/members/:userId", protect, ctrl.removeMember);

router.route("/:id").get(protect, ctrl.getHousehold).patch(protect, ctrl.updateHousehold).delete(protect, ctrl.deleteHousehold);

module.exports = router;
