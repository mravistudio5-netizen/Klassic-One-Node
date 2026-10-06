router.post(
  "/",
  requireRoles(
    "owner",
    "admin",
    "mis",
    "manager"
  ),
  async (req, res) => {
    let createdSheet = null;

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

      // ------------------------------------------------------------
      // VALIDATION
      // ------------------------------------------------------------

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Sheet name required",
        });
      }

      if (!link?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Link required",
        });
      }

      // ------------------------------------------------------------
      // USER IDS
      // ------------------------------------------------------------

      const selectedUserIds = normalizeIds(
        assigned_user_ids ||
          user_ids ||
          []
      );

      if (selectedUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Select at least one valid user",
        });
      }

      // ------------------------------------------------------------
      // FETCH USERS ONCE
      // ------------------------------------------------------------

      let users;

      try {
        users = await User.find({
          _id: {
            $in: selectedUserIds,
          },
        }).lean();
      } catch (userLookupError) {
        console.error(
          "Sheet user lookup error:",
          userLookupError
        );

        return res.status(400).json({
          success: false,
          message:
            "One or more selected users have an invalid ID",
          error: userLookupError.message,
        });
      }

      // ------------------------------------------------------------
      // CHECK ALL USERS EXIST
      // ------------------------------------------------------------

      const foundIds = new Set(
        users.map((user) =>
          String(user._id)
        )
      );

      const missingIds =
        selectedUserIds.filter(
          (id) =>
            !foundIds.has(String(id))
        );

      if (missingIds.length > 0) {
        console.error(
          "Invalid sheet user IDs:",
          missingIds
        );

        return res.status(400).json({
          success: false,
          message:
            "One or more selected users are invalid or no longer exist",
          invalid_user_ids: missingIds,
        });
      }

      // ------------------------------------------------------------
      // CREATE SHEET
      // ------------------------------------------------------------

      createdSheet = await Sheet.create({
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

      // ------------------------------------------------------------
      // CREATE USER ACCESS
      // ------------------------------------------------------------

      const accessItems = [];

      for (const user of users) {
        const userId =
          String(user._id);

        const data = {
          sheet_id:
            String(createdSheet._id),

          sheet_name:
            createdSheet.name,

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
            createdSheet.store_id ||
            "",

          expiry_date:
            expiry_date
              ? new Date(expiry_date)
              : null,

          active: true,
        };

        const existing =
          await SheetAccess.findOne({
            sheet_id:
              String(createdSheet._id),

            user_id:
              userId,
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

      // ------------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Sheet created and access assigned successfully",

        item: createdSheet,

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

      // ----------------------------------------------------------
      // CLEANUP IF SHEET WAS CREATED BUT ACCESS FAILED
      // ----------------------------------------------------------

      if (createdSheet?._id) {
        try {
          await SheetAccess.deleteMany({
            sheet_id:
              String(createdSheet._id),
          });

          await Sheet.deleteOne({
            _id: createdSheet._id,
          });

          console.error(
            "Rolled back partially created sheet:",
            String(createdSheet._id)
          );
        } catch (cleanupError) {
          console.error(
            "Sheet cleanup error:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to create sheet",

        error:
          error?.message || "",
      });
    }
  }
);