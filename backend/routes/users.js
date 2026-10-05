const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const RolePermission = require("../models/RolePermission");
const Invitation = require("../models/Invitation");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();

const ROLE_OPTIONS = [
  "owner",
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

// ======================================================
// TITAN SMTP
// ======================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtpout.secureserver.net",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

transporter.verify()
  .then(() => {
    console.log("Titan SMTP connection verified successfully");
  })
  .catch((error) => {
    console.error(
      "Titan SMTP verification failed:",
      error.message
    );
  });

// ======================================================
// PUBLIC USER
// ======================================================

function publicUser(user) {
  return {
    id: user._id?.toString?.() || user.id,
    email: user.email,
    name: user.name || "",
    full_name: user.name || "",
    role: user.role,
    manager_id: user.manager_id || "",
    mobile: user.mobile || "",
    google_email: user.google_email || "",
    store_id: user.store_id || "",
    department_id: user.department_id || "",
    department: user.department || "",
    shift: user.shift || "General",
    active: user.active !== false,
    language: user.language || "en",
  };
}

// ======================================================
// ADMIN / OWNER - USER LIST
// ======================================================

router.get(
  "/",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const items = await User.find({})
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        items: items.map(publicUser),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// INVITE USER + TITAN EMAIL
// ======================================================

router.post(
  "/invite",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const email = String(req.body.email || "")
        .trim()
        .toLowerCase();

      const name = String(req.body.name || "").trim();

      const role = String(req.body.role || "manager");

      const matrix = req.body.matrix || {};

      // --------------------------------------------------
      // VALIDATION
      // --------------------------------------------------

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      if (
        !ROLE_OPTIONS.includes(role) ||
        role === "owner"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      // --------------------------------------------------
      // CHECK EXISTING USER
      // --------------------------------------------------

      const exists = await User.findOne({ email });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }

      // --------------------------------------------------
      // TEMPORARY PASSWORD
      // --------------------------------------------------

      const temporaryPassword =
        crypto
          .randomBytes(6)
          .toString("base64url")
          .slice(0, 10) + "!1";

      const passwordHash = await bcrypt.hash(
        temporaryPassword,
        10
      );

      // --------------------------------------------------
      // CREATE USER
      // --------------------------------------------------

      const user = await User.create({
        email,
        passwordHash,
        name,
        role,
        active: true,
        language: "en",
      });

      // --------------------------------------------------
      // SAVE ROLE PERMISSIONS
      // --------------------------------------------------

      await RolePermission.findOneAndUpdate(
        { role },
        {
          $set: {
            matrix,
            modules: Object.keys(matrix).filter(
              (key) => matrix[key]?.read
            ),
          },

          $setOnInsert: {
            can_assign_cross_department: false,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      // --------------------------------------------------
      // CREATE INVITATION TOKEN
      // --------------------------------------------------

      const token = crypto.randomBytes(32).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const invitation = await Invitation.create({
        email,
        role,
        tokenHash,
        expiresAt: new Date(
          Date.now() +
            7 * 24 * 60 * 60 * 1000
        ),
        invitedBy: req.user._id,
        used: false,
      });

      // --------------------------------------------------
      // LOGIN URL
      // --------------------------------------------------

      const frontendUrl =
        process.env.FRONTEND_URL ||
        "https://one.klassicnx.com";

      const loginUrl = `${frontendUrl}/login`;

      // --------------------------------------------------
      // SEND TITAN EMAIL
      // --------------------------------------------------

      console.log("Attempting Titan SMTP invitation email...", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  recipient: email,
});
      try {
        await transporter.sendMail({
          from: `"Klassic One" <${process.env.SMTP_USER}>`,
          to: email,

          subject: "You're invited to Klassic One",

          // ----------------------------------------------
          // PLAIN TEXT EMAIL
          // ----------------------------------------------

          text: `
Hello ${name || "there"},

You have been invited to join Klassic One.

Role: ${role}

Login Email:
${email}

Temporary Password:
${temporaryPassword}

Login here:
${loginUrl}

Please change your temporary password after logging in.

This invitation was sent from Klassic One.
          `.trim(),

          // ----------------------------------------------
          // HTML EMAIL
          // ----------------------------------------------

          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Klassic One Invitation</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f5f6f8;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
  "
>

  <div
    style="
      max-width:600px;
      margin:40px auto;
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:14px;
      overflow:hidden;
    "
  >

    <!-- HEADER -->

    <div
      style="
        background:#111827;
        padding:26px 30px;
      "
    >
      <h1
        style="
          margin:0;
          color:#ffffff;
          font-size:24px;
        "
      >
        Klassic One
      </h1>

      <p
        style="
          margin:6px 0 0;
          color:#cbd5e1;
          font-size:13px;
        "
      >
        Klassic NX Fashions
      </p>
    </div>

    <!-- BODY -->

    <div
      style="
        padding:30px;
      "
    >

      <h2
        style="
          margin:0 0 20px;
          font-size:22px;
        "
      >
        You're invited to Klassic One
      </h2>

      <p>
        Hello ${name || "there"},
      </p>

      <p>
        You have been invited to join the
        Klassic One management system.
      </p>

      <!-- ACCOUNT DETAILS -->

      <div
        style="
          background:#f3f4f6;
          border-radius:10px;
          padding:18px;
          margin:24px 0;
        "
      >

        <p
          style="
            margin:0 0 10px;
          "
        >
          <strong>Role:</strong>
          ${role}
        </p>

        <p
          style="
            margin:0 0 10px;
          "
        >
          <strong>Login Email:</strong>
          ${email}
        </p>

        <p
          style="
            margin:0;
          "
        >
          <strong>Temporary Password:</strong>
          ${temporaryPassword}
        </p>

      </div>

      <!-- LOGIN BUTTON -->

      <div
        style="
          margin:28px 0;
        "
      >

        <a
          href="${loginUrl}"
          style="
            display:inline-block;
            background:#111827;
            color:#ffffff;
            padding:14px 24px;
            border-radius:8px;
            text-decoration:none;
            font-weight:bold;
          "
        >
          Join Klassic One
        </a>

      </div>

      <p
        style="
          margin-top:28px;
          font-size:13px;
          line-height:1.6;
          color:#6b7280;
        "
      >
        Please change your temporary password
        after signing in.
      </p>

      <p
        style="
          margin-top:24px;
          font-size:12px;
          color:#9ca3af;
        "
      >
        This is an automated email from
        Klassic One.
      </p>

    </div>

  </div>

</body>
</html>
          `,
        });
      } catch (mailError) {
        console.error(
          "Invitation email failed:",
          mailError.message
        );

        // ----------------------------------------------
        // ROLLBACK USER + INVITATION
        // ----------------------------------------------

        await Invitation.findByIdAndDelete(
          invitation._id
        ).catch(() => {});

        await User.findByIdAndDelete(
          user._id
        ).catch(() => {});

        return res.status(500).json({
          success: false,
          message:
            "Invitation email could not be sent.",
          emailError: mailError.message,
        });
      }

      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------

      return res.status(201).json({
        success: true,
        item: publicUser(user),
        temporaryPassword,
        inviteToken: token,
        message:
          "User invited and email sent successfully",
      });

    } catch (error) {
      console.error(
        "Invite user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// CREATE USER DIRECTLY
// ======================================================

router.post(
  "/",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const email = String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();

      const name = String(
        req.body.name || ""
      ).trim();

      const role = String(
        req.body.role || "manager"
      );

      const password = String(
        req.body.password || "Klassic@123"
      );

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      if (
        !ROLE_OPTIONS.includes(role) ||
        role === "owner"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      if (await User.findOne({ email })) {
        return res.status(409).json({
          success: false,
          message: "User already exists",
        });
      }

      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      const user = await User.create({
        email,
        passwordHash,
        name,
        role,
        mobile: req.body.mobile || "",
        store_id: req.body.store_id || "",
        department_id:
          req.body.department_id || "",
        department:
          req.body.department || "",
        shift:
          req.body.shift || "General",
        language:
          req.body.language || "en",
        active: true,
      });

      return res.status(201).json({
        success: true,
        item: publicUser(user),
        temporaryPassword: password,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// UPDATE USER
// ======================================================

router.patch(
  "/:id",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      const allowed = [
        "name",
        "role",
        "mobile",
        "google_email",
        "store_id",
        "department_id",
        "department",
        "shift",
        "active",
        "language",
      ];

      const update = {};

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          update[key] = req.body[key];
        }
      }

      if (
        update.role &&
        (
          !ROLE_OPTIONS.includes(update.role) ||
          update.role === "owner"
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      if (req.body.password) {
        update.passwordHash =
          await bcrypt.hash(
            String(req.body.password),
            10
          );
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          { $set: update },
          { new: true }
        ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        item: publicUser(user),
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// DELETE USER
// ======================================================

router.delete(
  "/:id",
  requireAuth,
  requireRoles("owner", "admin"),
  async (req, res) => {
    try {
      if (
        String(req.params.id) ===
        String(req.user._id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot delete your own account",
        });
      }

      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// REGISTER
// ======================================================

router.post(
  "/register",
  async (req, res) => {
    try {
      const email = String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        req.body.password || ""
      );

      const name = String(
        req.body.name || ""
      ).trim();

      const role = ROLE_OPTIONS.includes(
        req.body.role
      )
        ? req.body.role
        : "manager";

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required",
        });
      }

      if (await User.findOne({ email })) {
        return res.status(409).json({
          success: false,
          message: "User already exists",
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          10
        );

      const user = await User.create({
        email,
        passwordHash,
        name,
        role,
        active: true,
      });

      return res.status(201).json({
        success: true,
        user: publicUser(user),
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// LOGIN
// ======================================================

router.post(
  "/login",
  async (req, res) => {
    try {
      const email = String(
        req.body.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        req.body.password || ""
      );

      const user =
        await User.findOne({ email });

      if (
        !user ||
        user.active === false
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password",
        });
      }

      const ok =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!ok) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password",
        });
      }

      const token = jwt.sign(
        {
          id: user._id.toString(),
          userId: user._id.toString(),
          role: user.role,
          email: user.email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      return res.json({
        success: true,
        token,
        user: publicUser(user),
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// CURRENT USER
// ======================================================

router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    return res.json({
      success: true,
      user: publicUser(req.user),
    });
  }
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;