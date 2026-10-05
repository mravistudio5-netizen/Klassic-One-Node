const express = require("express");
const RolePermission = require("../models/RolePermission");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

const ROLES = [
  "owner",
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

// GET all role permissions
router.get("/roles", requireAuth, async (req, res) => {
  try {
    const items = await RolePermission.find({})
      .sort({ role: 1 })
      .lean();

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET permission by role
router.get("/roles/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params;

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const item = await RolePermission.findOne({ role }).lean();

    res.json({
      success: true,
      item: item || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET permission directly by role
// Frontend uses /api/permissions/owner
router.get("/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params;

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const item = await RolePermission.findOne({ role }).lean();

    res.json({
      success: true,
      item: item || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE role permission
router.put(
  "/roles/:role",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const { role } = req.params;

      if (!ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      const update = {
        matrix: req.body.matrix || {},
        modules: Array.isArray(req.body.modules)
          ? req.body.modules
          : [],
        can_assign_cross_department:
          !!req.body.can_assign_cross_department,
      };

      const item = await RolePermission.findOneAndUpdate(
        { role },
        { $set: update },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      res.json({
        success: true,
        item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;