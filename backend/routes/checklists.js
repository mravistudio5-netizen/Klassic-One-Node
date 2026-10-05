const express = require("express");

const Checklist = require("../models/Checklist");
const ChecklistEntry = require("../models/ChecklistEntry");

const {
  requireAuth,
  requireRoles,
} = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

/* =========================================================
   CHECKLIST TEMPLATES
   ========================================================= */

// GET /api/checklists
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    if (req.query.manager_id) {
      filter.manager_id = req.query.manager_id;
    }

    if (req.query.active !== undefined) {
      filter.active = req.query.active === "true";
    }

    if (req.query.all_managers !== undefined) {
      filter.all_managers =
        req.query.all_managers === "true";
    }

    const items = await Checklist.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error(
      "GET /api/checklists error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


/* =========================================================
   CHECKLIST ENTRIES
   IMPORTANT:
   Entries routes MUST come before /:id
   ========================================================= */

// GET /api/checklists/entries/list
router.get("/entries/list", async (req, res) => {
  try {
    const filter = {};

    if (req.query.checklist_id) {
      filter.checklist_id =
        req.query.checklist_id;
    }

    if (req.query.date) {
      filter.date = req.query.date;
    }

    if (req.query.month) {
      filter.month = req.query.month;
    }

    if (req.query.manager_id) {
      filter.manager_id =
        req.query.manager_id;
    }

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    const items = await ChecklistEntry.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error(
      "GET /api/checklists/entries/list error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// GET /api/checklists/entries/:id
router.get("/entries/:id", async (req, res) => {
  try {
    const item = await ChecklistEntry.findById(
      req.params.id
    ).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist entry not found",
      });
    }

    res.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error(
      "GET checklist entry error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// POST /api/checklists/entries
router.post("/entries", async (req, res) => {
  try {
    const {
      checklist_id,
      checklist_name,
      date,
      month,
      manager_id,
      manager_name,
      store_id,
      items,
      completed_pct,
      notes,
    } = req.body;

    if (!checklist_id) {
      return res.status(400).json({
        success: false,
        message: "checklist_id is required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date is required",
      });
    }

    if (!manager_id) {
      return res.status(400).json({
        success: false,
        message: "manager_id is required",
      });
    }

    const existing =
      await ChecklistEntry.findOne({
        checklist_id,
        date,
        manager_id,
      }).lean();

    if (existing) {
      return res.json({
        success: true,
        item: existing,
        existing: true,
      });
    }

    const entry = await ChecklistEntry.create({
      checklist_id,

      checklist_name:
        checklist_name || "",

      date,

      month:
        month ||
        String(date).slice(0, 7),

      manager_id,

      manager_name:
        manager_name || "",

      store_id:
        store_id || "",

      items: Array.isArray(items)
        ? items.map((item) => ({
            label: item.label || "",
            done: !!item.done,
            done_at:
              item.done_at || null,
          }))
        : [],

      completed_pct:
        typeof completed_pct === "number"
          ? completed_pct
          : 0,

      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      item: entry,
      existing: false,
    });
  } catch (error) {
    console.error(
      "POST checklist entry error:",
      error
    );

    if (error.code === 11000) {
      const existing =
        await ChecklistEntry.findOne({
          checklist_id:
            req.body.checklist_id,
          date: req.body.date,
          manager_id:
            req.body.manager_id,
        }).lean();

      return res.json({
        success: true,
        item: existing,
        existing: true,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// PATCH /api/checklists/entries/:id
router.patch(
  "/entries/:id",
  async (req, res) => {
    try {
      const update = {};

      const allowedFields = [
        "items",
        "completed_pct",
        "notes",
        "manager_name",
        "store_id",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          update[field] = req.body[field];
        }
      }

      if (Array.isArray(update.items)) {
        update.items = update.items.map(
          (item) => ({
            label: item.label || "",
            done: !!item.done,
            done_at:
              item.done_at || null,
          })
        );
      }

      if (
        update.completed_pct !==
        undefined
      ) {
        update.completed_pct =
          Math.max(
            0,
            Math.min(
              100,
              Number(
                update.completed_pct
              ) || 0
            )
          );
      }

      const item =
        await ChecklistEntry.findByIdAndUpdate(
          req.params.id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        ).lean();

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Checklist entry not found",
        });
      }

      res.json({
        success: true,
        item,
      });
    } catch (error) {
      console.error(
        "PATCH checklist entry error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/* =========================================================
   GET SINGLE CHECKLIST
   This MUST come AFTER /entries/*
   ========================================================= */

// GET /api/checklists/:id
router.get("/:id", async (req, res) => {
  try {
    const item = await Checklist.findById(
      req.params.id
    ).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist not found",
      });
    }

    res.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error(
      "GET checklist error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


/* =========================================================
   CREATE CHECKLIST
   ========================================================= */

// POST /api/checklists
router.post(
  "/",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager"
  ),
  async (req, res) => {
    try {
      const {
        name,
        store_id,
        store_name,
        manager_id,
        manager_name,
        all_managers,
        items,
        active,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Checklist name is required",
        });
      }

      const checklist =
        await Checklist.create({
          name: name.trim(),

          store_id: store_id || "",
          store_name: store_name || "",

          manager_id:
            manager_id || "",
          manager_name:
            manager_name || "",

          all_managers:
            !!all_managers,

          items: Array.isArray(items)
            ? items.map((item) => ({
                label:
                  item.label || "",
                required:
                  !!item.required,
              }))
            : [],

          active:
            active !== false,

          created_by_id:
            req.user?._id?.toString() ||
            "",

          created_by_name:
            req.user?.name ||
            req.user?.full_name ||
            req.user?.email ||
            "",
        });

      res.status(201).json({
        success: true,
        item: checklist,
      });
    } catch (error) {
      console.error(
        "POST /api/checklists error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/* =========================================================
   UPDATE CHECKLIST
   ========================================================= */

// PATCH /api/checklists/:id
router.patch(
  "/:id",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager"
  ),
  async (req, res) => {
    try {
      const update = {};

      const allowedFields = [
        "name",
        "store_id",
        "store_name",
        "manager_id",
        "manager_name",
        "all_managers",
        "items",
        "active",
      ];

      for (const field of allowedFields) {
        if (
          req.body[field] !==
          undefined
        ) {
          update[field] =
            req.body[field];
        }
      }

      if (
        update.name !== undefined
      ) {
        update.name =
          String(
            update.name
          ).trim();
      }

      if (
        Array.isArray(update.items)
      ) {
        update.items =
          update.items.map(
            (item) => ({
              label:
                item.label || "",
              required:
                !!item.required,
            })
          );
      }

      const item =
        await Checklist.findByIdAndUpdate(
          req.params.id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        ).lean();

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Checklist not found",
        });
      }

      res.json({
        success: true,
        item,
      });
    } catch (error) {
      console.error(
        "PATCH checklist error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ARCHIVE CHECKLIST
   ========================================================= */

// DELETE /api/checklists/:id
router.delete(
  "/:id",
  requireRoles(
    "owner",
    "admin",
    "mis"
  ),
  async (req, res) => {
    try {
      const item =
        await Checklist.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              active: false,
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Checklist not found",
        });
      }

      res.json({
        success: true,
        message:
          "Checklist archived",
        item,
      });
    } catch (error) {
      console.error(
        "DELETE checklist error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


module.exports = router;