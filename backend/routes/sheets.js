const express = require("express");

const Sheet = require("../models/Sheet");
const SheetAccess = require("../models/SheetAccess");
const User = require("../models/User");

const {
  requireAuth,
  requireRoles,
} = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getUserName = (user) =>
  user?.name ||
  user?.full_name ||
  user?.email ||
  "";

const normalizeIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];
};

/*
|--------------------------------------------------------------------------
| GET SHEETS
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.archived === "false") {
      filter.archived = false;
    }

    if (req.query.archived === "true") {
      filter.archived = true;
    }

    if (req.query.store_id) {
      filter.store_id = String(
        req.query.store_id
      );
    }

    if (req.query.department_id) {
      filter.department_id = String(
        req.query.department_id
      );
    }

    const items = await Sheet.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error(
      "Get sheets error:",
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
| GET SHEET ACCESS
|--------------------------------------------------------------------------
|
| Owner/Admin:
| /api/sheets/access?all=true
|
| Normal user:
| /api/sheets/access?user_id=USER_ID
|
|--------------------------------------------------------------------------
*/

router.get("/access", async (req, res) => {
  try {
    const user = req.user;

    const filter = {
      active: true,
    };

    if (
      ["owner", "admin"].includes(
        user.role
      ) &&
      req.query.all === "true"
    ) {
      // Owner/Admin can see all
    } else {
      filter.user_id =
        req.query.user_id ||
        String(user._id);
    }

    const items =
      await SheetAccess.find(filter)
        .sort({ createdAt: -1 })
        .lean();

    const sheetIds = items.map(
      (item) => item.sheet_id
    );

    const sheets = await Sheet.find({
      _id: {
        $in: sheetIds,
      },
    }).lean();

    const sheetMap = {};

    sheets.forEach((sheet) => {
      sheetMap[String(sheet._id)] =
        sheet;
    });

    const result = items.map((item) => {
      const sheet =
        sheetMap[item.sheet_id];

      return {
        ...item,

        sheet_name:
          item.sheet_name ||
          sheet?.name ||
          "",

        sheet_url:
          sheet?.link || "",

        link:
          sheet?.link || "",

        purpose:
          sheet?.purpose ||
          item.purpose ||
          "",

        category:
          sheet?.category ||
          item.category ||
          "",

        sensitivity:
          sheet?.sensitivity ||
          item.sensitivity ||
          "",

        department_id:
          sheet?.department_id || "",

        department_name:
          sheet?.department_name || "",

        store_id:
          sheet?.store_id || "",

        all_stores:
          !!sheet?.all_stores,
      };
    });

    res.json({
      success: true,
      items: result,
    });
  } catch (error) {
    console.error(
      "Get sheet access error:",
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
| GET SINGLE SHEET
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  try {
    const item =
      await Sheet.findById(
        req.params.id
      ).lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Sheet not found",
      });
    }

    res.json({
      success: true,
      item,
    });
  } catch (error) {
    console.error(
      "Get single sheet error:",
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
| CREATE SHEET
|--------------------------------------------------------------------------
*/

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
        link,
        purpose,
        category,
        sensitivity,
        notes,

        store_id,
        all_stores,

        department_id,
        department_name,

        user_ids,
        assigned_user_ids,

        access_level,
        expiry_date,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | VALIDATION
      |--------------------------------------------------------------------------
      */

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Sheet name required",
        });
      }

      if (!link?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Link required",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | USER IDS
      |--------------------------------------------------------------------------
      |
      | Frontend may send either:
      |
      | user_ids
      | assigned_user_ids
      |
      */

      const selectedUserIds =
        normalizeIds(
          assigned_user_ids ||
            user_ids ||
            []
        );

      /*
      |--------------------------------------------------------------------------
      | CREATE SHEET
      |--------------------------------------------------------------------------
      */

      const sheet =
        await Sheet.create({
          name: name.trim(),

          link: link.trim(),

          purpose:
            purpose?.trim() || "",

          category:
            category || "Other",

          sensitivity:
            sensitivity || "Low",

          notes:
            notes?.trim() || "",

          store_id:
            all_stores
              ? ""
              : store_id || "",

          all_stores:
            !!all_stores,

          department_id:
            department_id || "",

          department_name:
            department_name || "",

          created_by_id:
            String(req.user._id),

          created_by_name:
            getUserName(req.user),
        });

      /*
      |--------------------------------------------------------------------------
      | CREATE USER ACCESS
      |--------------------------------------------------------------------------
      */

      const accessItems = [];

      if (
        selectedUserIds.length > 0
      ) {
        const users =
          await User.find({
            _id: {
              $in: selectedUserIds,
            },
          }).lean();

        for (const user of users) {
          const userId =
            String(user._id);

          const data = {
            sheet_id:
              String(sheet._id),

            sheet_name:
              sheet.name,

            user_id:
              userId,

            user_name:
              getUserName(user),

            user_email:
              user.email || "",

            manager_id:
              userId,

            manager_name:
              getUserName(user),

            access_level:
              access_level || "View",

            store_id:
              user.store_id ||
              sheet.store_id ||
              "",

            expiry_date:
              expiry_date
                ? new Date(
                    expiry_date
                  )
                : null,

            active: true,
          };

          const existing =
            await SheetAccess.findOne({
              sheet_id:
                String(sheet._id),

              user_id: userId,
            });

          let item;

          if (existing) {
            item =
              await SheetAccess.findByIdAndUpdate(
                existing._id,
                {
                  $set: data,
                },
                {
                  new: true,
                }
              );
          } else {
            item =
              await SheetAccess.create(
                data
              );
          }

          accessItems.push(item);
        }
      }

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.status(201).json({
        success: true,

        item: sheet,

        access:
          accessItems,

        assigned_users:
          accessItems.length,
      });
    } catch (error) {
      console.error(
        "Create sheet error:",
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
| ASSIGN SHEET TO USER
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/access",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager"
  ),
  async (req, res) => {
    try {
      const sheet =
        await Sheet.findById(
          req.params.id
        );

      if (!sheet) {
        return res.status(404).json({
          success: false,
          message:
            "Sheet not found",
        });
      }

      const {
        user_id,
        access_level,
        expiry_date,
        active,
      } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message:
            "User is required",
        });
      }

      const user =
        await User.findById(
          user_id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const existing =
        await SheetAccess.findOne({
          sheet_id:
            String(sheet._id),

          user_id:
            String(user._id),
        });

      const data = {
        sheet_id:
          String(sheet._id),

        sheet_name:
          sheet.name,

        user_id:
          String(user._id),

        user_name:
          getUserName(user),

        user_email:
          user.email || "",

        manager_id:
          String(user._id),

        manager_name:
          getUserName(user),

        access_level:
          access_level || "View",

        store_id:
          user.store_id ||
          sheet.store_id ||
          "",

        expiry_date:
          expiry_date
            ? new Date(
                expiry_date
              )
            : null,

        active:
          active !== false,
      };

      let item;

      if (existing) {
        item =
          await SheetAccess.findByIdAndUpdate(
            existing._id,
            {
              $set: data,
            },
            {
              new: true,
            }
          );
      } else {
        item =
          await SheetAccess.create(
            data
          );
      }

      res.status(201).json({
        success: true,
        item,
      });
    } catch (error) {
      console.error(
        "Assign sheet error:",
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
| UPDATE ACCESS / FAVOURITE
|--------------------------------------------------------------------------
*/

router.patch(
  "/access/:id",
  async (req, res) => {
    try {
      const item =
        await SheetAccess.findById(
          req.params.id
        );

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Sheet access not found",
        });
      }

      const allowed = [
        "access_level",
        "expiry_date",
        "active",
        "favourite",
        "reason",
      ];

      const update = {};

      allowed.forEach((key) => {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            key
          )
        ) {
          update[key] =
            req.body[key];
        }
      });

      if (update.expiry_date) {
        update.expiry_date =
          new Date(
            update.expiry_date
          );
      }

      const updated =
        await SheetAccess.findByIdAndUpdate(
          req.params.id,
          {
            $set: update,
          },
          {
            new: true,
          }
        );

      res.json({
        success: true,
        item: updated,
      });
    } catch (error) {
      console.error(
        "Update sheet access error:",
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
| DELETE SHEET
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
      const sheet =
        await Sheet.findById(
          req.params.id
        );

      if (!sheet) {
        return res.status(404).json({
          success: false,
          message:
            "Sheet not found",
        });
      }

      await SheetAccess.deleteMany({
        sheet_id:
          String(sheet._id),
      });

      await Sheet.deleteOne({
        _id: sheet._id,
      });

      res.json({
        success: true,
        message:
          "Sheet deleted",
      });
    } catch (error) {
      console.error(
        "Delete sheet error:",
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
| ARCHIVE / UPDATE SHEET
|--------------------------------------------------------------------------
*/

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
      const updated =
        await Sheet.findByIdAndUpdate(
          req.params.id,
          {
            $set: req.body,
          },
          {
            new: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message:
            "Sheet not found",
        });
      }

      res.json({
        success: true,
        item: updated,
      });
    } catch (error) {
      console.error(
        "Update sheet error:",
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