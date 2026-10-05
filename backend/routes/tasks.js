const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Task = require("../models/Task");
const AuditLog = require("../models/AuditLog");
const {
  requireAuth,
  requireRoles,
} = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

/*
|--------------------------------------------------------------------------
| FILE UPLOAD CONFIG
|--------------------------------------------------------------------------
*/

const uploadDir = path.join(
  __dirname,
  "../uploads/tasks"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext =
      path.extname(file.originalname) || "";

    const filename =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${ext}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize:
      100 * 1024 * 1024,
  },
});


/*
|--------------------------------------------------------------------------
| CLEAN TASK
|--------------------------------------------------------------------------
*/

function cleanTask(task) {
  if (!task) return null;

  const obj =
    task.toObject
      ? task.toObject()
      : task;

  const cleaned = {
    ...obj,
    id:
      obj._id?.toString() ||
      obj.id,
  };

  delete cleaned._id;

  return cleaned;
}


/*
|--------------------------------------------------------------------------
| GET ALL TASKS
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const {
      store_id,
      assigned_to_id,
      status,
      active,
      template_name,
      limit = 200,
    } = req.query;

    const query = {};

    if (
      store_id &&
      store_id !== "all"
    ) {
      query.store_id = store_id;
    }

    if (assigned_to_id) {
      query.assigned_to_id =
        assigned_to_id;
    }

    if (status) {
      if (Array.isArray(status)) {
        query.status = {
          $in: status,
        };
      } else {
        query.status = status;
      }
    }

    if (active !== undefined) {
      query.active =
        active === "true";
    }

    if (template_name) {
      query.template_name =
        template_name;
    }

    const items =
      await Task.find(query)
        .sort({
          due_date: 1,
          createdAt: -1,
        })
        .limit(
          Math.min(
            Number(limit) || 200,
            500
          )
        )
        .lean();

    res.json({
      success: true,
      items: items.map(cleanTask),
    });
  } catch (error) {
    console.error(
      "GET /api/tasks error:",
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
| GET TASK TEMPLATES
|--------------------------------------------------------------------------
*/

router.get(
  "/templates",
  async (req, res) => {
    try {
      const {
        store_id,
        limit = 200,
      } = req.query;

      const query = {
        template_name: {
          $exists: true,
          $ne: "",
        },
      };

      if (
        store_id &&
        store_id !== "all"
      ) {
        query.store_id =
          store_id;
      }

      const items =
        await Task.find(query)
          .sort({
            createdAt: -1,
          })
          .limit(
            Math.min(
              Number(limit) || 200,
              500
            )
          )
          .lean();

      res.json({
        success: true,
        items: items.map(cleanTask),
      });
    } catch (error) {
      console.error(
        "GET /api/tasks/templates error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| UPLOAD TASK PROOF FILE
|--------------------------------------------------------------------------
|
| POST /api/tasks/:id/upload
|
| multipart/form-data
| field name: file
|
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task id",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "File is required",
        });
      }

      const task =
        await Task.findById(
          req.params.id
        );

      if (!task) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found",
        });
      }

      const fileUri =
        `/uploads/tasks/${req.file.filename}`;

      res.status(201).json({
        success: true,

        file_uri:
          fileUri,

        file_url:
          fileUri,

        original_name:
          req.file.originalname,

        mime_type:
          req.file.mimetype,

        size:
          req.file.size,
      });
    } catch (error) {
      console.error(
        "Task file upload error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Upload failed",
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| GET SINGLE TASK
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task id",
        });
      }

      const task =
        await Task.findById(
          req.params.id
        ).lean();

      if (!task) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found",
        });
      }

      res.json({
        success: true,
        item: cleanTask(task),
      });
    } catch (error) {
      console.error(
        "GET single task error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager",
    "tailoring_manager"
  ),
  async (req, res) => {
    try {
      const payload = {
        ...req.body,

        created_by_id:
          req.body.created_by_id ||
          req.user._id.toString(),

        created_by_name:
          req.body.created_by_name ||
          req.user.name ||
          req.user.email,
      };

      const task =
        await Task.create(
          payload
        );

      try {
        await AuditLog.create({
          module: "Tasks",

          action:
            task.template_name
              ? "Template Created"
              : "Task Created",

          entity_id:
            task._id.toString(),

          entity_name:
            task.title,

          actor_id:
            req.user._id.toString(),

          actor_name:
            req.user.name ||
            req.user.email,

          store_id:
            task.store_id || "",

          details:
            task.template_name
              ? `Template: ${task.template_name}`
              : "",
        });
      } catch (auditError) {
        console.error(
          "Task audit failed:",
          auditError.message
        );
      }

      res.status(201).json({
        success: true,
        item: cleanTask(task),
      });
    } catch (error) {
      console.error(
        "POST /api/tasks error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| UPDATE TASK
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager",
    "tailoring_manager",
    "tailoring_operator"
  ),
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task id",
        });
      }

      const oldTask =
        await Task.findById(
          req.params.id
        );

      if (!oldTask) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found",
        });
      }

      const task =
        await Task.findByIdAndUpdate(
          req.params.id,
          {
            $set: req.body,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      try {
        await AuditLog.create({
          module: "Tasks",
          action: "Task Updated",

          entity_id:
            task._id.toString(),

          entity_name:
            task.title,

          actor_id:
            req.user._id.toString(),

          actor_name:
            req.user.name ||
            req.user.email,

          store_id:
            task.store_id || "",

          details: "",
        });
      } catch (auditError) {
        console.error(
          "Task audit failed:",
          auditError.message
        );
      }

      res.json({
        success: true,
        item: cleanTask(task),
      });
    } catch (error) {
      console.error(
        "PATCH /api/tasks error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  requireRoles(
    "owner",
    "admin"
  ),
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid task id",
        });
      }

      const task =
        await Task.findById(
          req.params.id
        );

      if (!task) {
        return res.status(404).json({
          success: false,
          message:
            "Task not found",
        });
      }

      await Task.findByIdAndDelete(
        req.params.id
      );

      try {
        await AuditLog.create({
          module: "Tasks",
          action: "Task Deleted",

          entity_id:
            task._id.toString(),

          entity_name:
            task.title,

          actor_id:
            req.user._id.toString(),

          actor_name:
            req.user.name ||
            req.user.email,

          store_id:
            task.store_id || "",

          details:
            `Template: ${
              task.template_name ||
              "—"
            }`,
        });
      } catch (auditError) {
        console.error(
          "Task audit failed:",
          auditError.message
        );
      }

      res.json({
        success: true,
        message:
          "Task deleted",
      });
    } catch (error) {
      console.error(
        "DELETE /api/tasks error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| BULK CREATE
|--------------------------------------------------------------------------
*/

router.post(
  "/bulk",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager"
  ),
  async (req, res) => {
    try {
      const items =
        Array.isArray(
          req.body.items
        )
          ? req.body.items
          : [];

      if (!items.length) {
        return res.status(400).json({
          success: false,
          message:
            "items array required",
        });
      }

      const prepared =
        items.map((item) => ({
          ...item,

          created_by_id:
            item.created_by_id ||
            req.user._id.toString(),

          created_by_name:
            item.created_by_name ||
            req.user.name ||
            req.user.email,
        }));

      const created =
        await Task.insertMany(
          prepared
        );

      res.status(201).json({
        success: true,
        items:
          created.map(
            cleanTask
          ),
      });
    } catch (error) {
      console.error(
        "POST /api/tasks/bulk error:",
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