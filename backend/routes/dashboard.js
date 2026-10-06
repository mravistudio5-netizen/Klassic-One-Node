const express = require("express");
const Task = require("../models/Task");
const Alteration = require("../models/Alteration");
const PantStitch = require("../models/PantStitch");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

async function getDashboardData(req) {
  const role =
    req.user?.role === "admin"
      ? "owner"
      : req.user?.role || "manager";

  const today = new Date();

  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const endToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const baseTaskQuery = {};

  if (["owner", "admin", "manager"].includes(role)) {
  baseTaskQuery.assigned_to_id = req.user._id.toString();
}

  if (
    req.query.store_id &&
    req.query.store_id !== "all"
  ) {
    baseTaskQuery.store_id = req.query.store_id;
  }

  const todayTasks = await Task.find({
    ...baseTaskQuery,
    due_date: {
      $gte: startToday,
      $lt: endToday,
    },
  }).lean();

  const pendingTasks = todayTasks.filter(
    (task) =>
      task.status === "Pending" ||
      task.status === "In Progress"
  );

  const completedTasks = todayTasks.filter(
    (task) =>
      task.status === "Done" ||
      task.status === "Approved"
  );

  const overdueTasks = await Task.countDocuments({
    ...baseTaskQuery,
    status: {
      $in: ["Pending", "In Progress"],
    },
    due_date: {
      $lt: startToday,
    },
  });

  let alterActive = 0;
  let stitchActive = 0;
  let totalTailors = 0;

  try {
    alterActive =
      await Alteration.countDocuments({
        ...(baseTaskQuery.store_id
          ? {
              store_id:
                baseTaskQuery.store_id,
            }
          : {}),
        status: {
          $in: ["Received", "Completed"],
        },
      });
  } catch (error) {
    console.log(
      "Alteration stats unavailable:",
      error.message
    );
  }

  try {
    stitchActive =
      await PantStitch.countDocuments({
        ...(baseTaskQuery.store_id
          ? {
              store_id:
                baseTaskQuery.store_id,
            }
          : {}),
        status: {
          $in: [
            "Received",
            "Given to Tailor",
            "Completed",
          ],
        },
      });
  } catch (error) {
    console.log(
      "Pant stitch stats unavailable:",
      error.message
    );
  }

  try {
    totalTailors =
      await User.countDocuments({
        role: {
          $in: [
            "tailoring_manager",
            "tailoring_operator",
          ],
        },
        active: true,
      });
  } catch (error) {
    console.log(
      "Tailor count unavailable:",
      error.message
    );
  }

  return {
    success: true,

    role,

    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },

    stats: {
      today: todayTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks,
      pending: pendingTasks.length,
    },

    tailorStats: {
      alterActive,
      stitchActive,
      overdue: 0,
      totalTailors,
    },

    tasks: {
      today: todayTasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks,
    },
  };
}

/*
|--------------------------------------------------------------------------
| OWNER DASHBOARD
|--------------------------------------------------------------------------
*/

router.get("/owner", async (req, res) => {
  try {
    const data = await getDashboardData(req);

    res.json(data);
  } catch (error) {
    console.error(
      "GET /api/dashboard/owner:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| MANAGER DASHBOARD
|--------------------------------------------------------------------------
*/

router.get("/manager", async (req, res) => {
  try {
    const data = await getDashboardData(req);

    res.json(data);
  } catch (error) {
    console.error(
      "GET /api/dashboard/manager:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| GENERAL DASHBOARD
|--------------------------------------------------------------------------
*/

router.get("/stats", async (req, res) => {
  try {
    const data = await getDashboardData(req);

    res.json(data);
  } catch (error) {
    console.error(
      "GET /api/dashboard/stats:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await getDashboardData(req);

    res.json(data);
  } catch (error) {
    console.error(
      "GET /api/dashboard:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;