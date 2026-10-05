const express = require("express");

const Task = require("../models/Task");
const Alteration = require("../models/Alteration");
const PantStitch = require("../models/PantStitch");
const ChecklistEntry = require("../models/ChecklistEntry");

const router = express.Router();

const MODELS = {
  Task,
  Alteration,
  PantStitch,
  ChecklistEntry,
};

function parseValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getModel(entity) {
  return MODELS[entity];
}

// ======================================================
// AGGREGATE REPORT
// ======================================================

router.get("/aggregate", async (req, res) => {
  try {
    const {
      entity,
      query,
      groupBy,
      dateBucket,
      count,
      avg,
      limit,
    } = req.query;

    const Model = getModel(entity);

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity: ${entity}`,
      });
    }

    const filter = query
      ? parseValue(query)
      : {};

    const pipeline = [];

    // --------------------------------------------------
    // MATCH
    // --------------------------------------------------

    pipeline.push({
      $match: filter || {},
    });

    // --------------------------------------------------
    // GROUP
    // --------------------------------------------------

    const groupId = {};

    // Date bucket
    if (dateBucket) {
      const bucket = parseValue(dateBucket);

      if (bucket?.field) {
        groupId[bucket.field] = {
          $dateToString: {
            format:
              bucket.unit === "month"
                ? "%Y-%m"
                : "%Y-%m-%d",
            date: `$${bucket.field}`,
          },
        };
      }
    }

    // Normal groupBy
    if (groupBy) {
      const groups = Array.isArray(
        parseValue(groupBy)
      )
        ? parseValue(groupBy)
        : [groupBy];

      groups.forEach((field) => {
        if (field) {
          groupId[field] = `$${field}`;
        }
      });
    }

    const groupStage = {
      _id: groupId,
    };

    // Count
    if (count === "true" || count === true) {
      groupStage.count = {
        $sum: 1,
      };
    }

    // Average
    if (avg) {
      groupStage[`avg_${avg}`] = {
        $avg: `$${avg}`,
      };
    }

    // If no aggregation was requested
    if (
      Object.keys(groupStage).length === 1
    ) {
      groupStage.count = {
        $sum: 1,
      };
    }

    pipeline.push({
      $group: groupStage,
    });

    // --------------------------------------------------
    // PROJECT
    // --------------------------------------------------

    const project = {
      _id: 0,
    };

    Object.keys(groupId).forEach((field) => {
      project[field] = `$_id.${field}`;
    });

    if (
      groupStage.count
    ) {
      project.count = 1;
    }

    if (avg) {
      project[`avg_${avg}`] = 1;
    }

    pipeline.push({
      $project: project,
    });

    // --------------------------------------------------
    // SORT
    // --------------------------------------------------

    if (dateBucket) {
      const bucket = parseValue(dateBucket);

      if (bucket?.field) {
        pipeline.push({
          $sort: {
            [bucket.field]: -1,
          },
        });
      }
    }

    // --------------------------------------------------
    // LIMIT
    // --------------------------------------------------

    const max =
      Number(limit) || 100;

    pipeline.push({
      $limit: Math.min(max, 500),
    });

    const rows =
      await Model.aggregate(pipeline);

    res.json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error(
      "REPORT AGGREGATE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// LIST REPORT
// ======================================================

router.get("/list", async (req, res) => {
  try {
    const {
      entity,
      query,
      sort,
      limit,
    } = req.query;

    const Model = getModel(entity);

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity: ${entity}`,
      });
    }

    const filter = query
      ? parseValue(query)
      : {};

    const max =
      Number(limit) || 100;

    const items = await Model.find(filter)
      .sort(sort || "-createdAt")
      .limit(Math.min(max, 500))
      .lean();

    res.json({
      success: true,
      items: items.map((item) => ({
        ...item,
        id: item._id
          ? item._id.toString()
          : item.id,
      })),
    });
  } catch (error) {
    console.error(
      "REPORT LIST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================================
// DELETE REPORT DATA
// ======================================================

router.post("/delete", async (req, res) => {
  try {
    const {
      entity,
      query,
    } = req.body;

    const Model = getModel(entity);

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity: ${entity}`,
      });
    }

    const result =
      await Model.deleteMany(
        query || {}
      );

    res.json({
      success: true,
      count: result.deletedCount || 0,
    });
  } catch (error) {
    console.error(
      "REPORT DELETE ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;