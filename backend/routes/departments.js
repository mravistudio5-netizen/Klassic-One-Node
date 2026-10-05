const express = require("express");
const Department = require("../models/Department");

const router = express.Router();

// GET /api/departments
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .limit(200)
      .lean();

    const items = departments.map((d) => ({
      ...d,
      id: d._id.toString(),
      _id: undefined,
    }));

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Load departments failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load departments",
    });
  }
});

// POST /api/departments
router.post("/", async (req, res) => {
  try {
    const {
      name,
      code = "",
      store_id = "",
      store_name = "",
      head_name = "",
      active = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim(),
      store_id,
      store_name,
      head_name,
      active,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      item: {
        ...department.toObject(),
        id: department._id.toString(),
      },
    });
  } catch (error) {
    console.error("Create department failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create department",
    });
  }
});

// PATCH /api/departments/:id
router.patch("/:id", async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.json({
      success: true,
      item: {
        ...department.toObject(),
        id: department._id.toString(),
      },
    });
  } catch (error) {
    console.error("Update department failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update department",
    });
  }
});

// DELETE /api/departments/:id
router.delete("/:id", async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(
      req.params.id
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete department",
    });
  }
});

module.exports = router;