const express = require("express");
const Store = require("../models/Store");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const items = await Store.find({})
      .sort({ name: 1 })
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

router.post(
  "/",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const store = await Store.create({
        name: req.body.name,
        code: req.body.code || "",
        city: req.body.city || "",
        address: req.body.address || "",
        opening_time: req.body.opening_time || "10:00",
        locations: req.body.locations || [
          "Basement",
          "Ground Floor",
          "Floor 1",
          "Floor 2",
          "Floor 3",
          "4th Floor Warehouse",
          "Washroom",
          "Terrace",
        ],
        active: req.body.active !== false,
      });

      res.status(201).json({
        success: true,
        item: store,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const store = await Store.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).lean();

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        item: store,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const store = await Store.findByIdAndDelete(req.params.id);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Store not found",
        });
      }

      res.json({
        success: true,
        message: "Store deleted",
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