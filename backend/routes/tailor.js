const express = require("express");
const router = express.Router();

const Store = require("../models/Store");
const Tailor = require("../models/Tailor");
const Alteration = require("../models/Alteration");
const PantStitch = require("../models/PantStitch");
const AuditLog = require("../models/AuditLog");

const toId = (doc) => {
  if (!doc) return doc;

  const item = doc.toObject ? doc.toObject() : { ...doc };

  if (item._id) {
    item.id = item._id.toString();
  }

  return item;
};

const toItems = (items) => items.map(toId);

// ======================================================
// STORES
// ======================================================

router.get("/stores", async (req, res) => {
  try {
    const stores = await Store.find({
      active: true,
    })
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      items: toItems(stores),
    });
  } catch (error) {
    console.error("GET STORES ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// ALTERATIONS
// ======================================================

router.get("/alterations", async (req, res) => {
  try {
    const filter = {};

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const items = await Alteration.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items: toItems(items),
    });
  } catch (error) {
    console.error("GET ALTERATIONS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/alterations", async (req, res) => {
  try {
    const item = await Alteration.create(req.body);

    res.status(201).json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error("CREATE ALTERATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/alterations/:id", async (req, res) => {
  try {
    const item = await Alteration.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Alteration not found",
      });
    }

    res.json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error("UPDATE ALTERATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// PANT STITCHING
// ======================================================

router.get("/pant-stitch", async (req, res) => {
  try {
    const filter = {};

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const items = await PantStitch.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items: toItems(items),
    });
  } catch (error) {
    console.error("GET PANT STITCH ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/pant-stitch", async (req, res) => {
  try {
    const item = await PantStitch.create(req.body);

    res.status(201).json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error("CREATE PANT STITCH ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/pant-stitch/:id", async (req, res) => {
  try {
    const item = await PantStitch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Pant stitching record not found",
      });
    }

    res.json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error("UPDATE PANT STITCH ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/pant-stitch/bulk-update", async (req, res) => {
  try {
    const { ids, update } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids array is required",
      });
    }

    const result = await PantStitch.updateMany(
      {
        _id: {
          $in: ids,
        },
      },
      {
        $set: update || {},
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "BULK UPDATE PANT STITCH ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// TAILORS
// ======================================================

router.get("/tailors", async (req, res) => {
  try {
    const filter = {};

    if (req.query.store_id) {
      filter.store_id = req.query.store_id;
    }

    if (req.query.active !== undefined) {
      filter.active =
        req.query.active === "true";
    }

    const items = await Tailor.find(filter)
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      items: toItems(items),
    });
  } catch (error) {
    console.error("GET TAILORS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/tailors", async (req, res) => {
  try {
    const item = await Tailor.create(req.body);

    res.status(201).json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error("CREATE TAILOR ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.patch("/tailors/:id", async (req, res) => {
  try {
    const item =
      await Tailor.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Tailor not found",
      });
    }

    res.json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error(
      "UPDATE TAILOR ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// DELETE TAILOR
// ======================================================

router.delete("/tailors/:id", async (req, res) => {
  try {
    const item =
      await Tailor.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Tailor not found",
      });
    }

    await Tailor.findByIdAndDelete(
      req.params.id
    );

    res.json({
      success: true,
      message: "Tailor deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE TAILOR ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// TAILOR STATS
// ======================================================

router.get("/stats", async (req, res) => {
  try {
    const storeMatch =
      req.query.store_id
        ? {
            store_id:
              req.query.store_id,
          }
        : {};

    const [
      tailors,
      current,
      monthly,
      totals,
    ] = await Promise.all([
      Tailor.find(storeMatch)
        .sort({ name: 1 })
        .lean(),

      PantStitch.aggregate([
        {
          $match: {
            ...storeMatch,
            status: "Given to Tailor",
          },
        },
        {
          $group: {
            _id: "$tailor_id",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            tailor_id: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),

      PantStitch.aggregate([
        {
          $match: {
            ...storeMatch,
            status: {
              $in: [
                "Completed",
                "Delivered",
              ],
            },
            completed_at: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: {
              tailor_id:
                "$tailor_id",
              month: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$completed_at",
                },
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            tailor_id:
              "$_id.tailor_id",
            completed_at:
              "$_id.month",
            count: 1,
          },
        },
        {
          $sort: {
            completed_at: -1,
            count: -1,
          },
        },
      ]),

      Promise.all([
        Alteration.countDocuments(
          storeMatch
        ),

        Alteration.countDocuments({
          ...storeMatch,
          status: "Completed",
        }),

        PantStitch.countDocuments(
          storeMatch
        ),

        PantStitch.countDocuments({
          ...storeMatch,
          status: "Completed",
        }),
      ]),
    ]);

    res.json({
      success: true,

      tailors:
        toItems(tailors),

      current,

      monthly,

      stats: {
        totalAlterations:
          totals[0],

        completedAlterations:
          totals[1],

        totalPantStitch:
          totals[2],

        completedPantStitch:
          totals[3],

        totalTailors:
          tailors.length,
      },
    });
  } catch (error) {
    console.error(
      "GET STATS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// AUDIT LOG
// ======================================================

router.post("/audit", async (req, res) => {
  try {
    const item =
      await AuditLog.create(req.body);

    res.status(201).json({
      success: true,
      item: toId(item),
    });
  } catch (error) {
    console.error(
      "CREATE AUDIT ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;