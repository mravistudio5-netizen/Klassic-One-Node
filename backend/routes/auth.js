const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "klassic-secret";


/* =========================================================
   REGISTER
   ========================================================= */

router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      mobile,
      store_id,
      department_id,
      department,
      shift,
      language,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,

      name: name || "",

      role:
        role || "manager",

      mobile:
        mobile || "",

      store_id:
        store_id || "",

      department_id:
        department_id || "",

      department:
        department || "",

      shift:
        shift || "General",

      language:
        language || "en",

      resetPasswordToken: "",
      resetPasswordExpiresAt: null,
    });

    res.status(201).json({
      success: true,
      message:
        "User created successfully",

      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create user",
    });
  }
});


/* =========================================================
   LOGIN
   ========================================================= */

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
      });
    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    /*
     * Keep BOTH id and userId.
     *
     * auth middleware uses decoded.id
     * /me compatibility uses userId.
     */
    const token = jwt.sign(
      {
        id: user._id.toString(),
        userId: user._id.toString(),
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      token,

      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,

        manager_id:
          user.manager_id,

        mobile:
          user.mobile,

        google_email:
          user.google_email,

        store_id:
          user.store_id,

        department_id:
          user.department_id,

        department:
          user.department,

        shift:
          user.shift,

        active:
          user.active,

        language:
          user.language,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});


/* =========================================================
   ME
   ========================================================= */

router.get("/me", async (req, res) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    const userId =
      decoded.id ||
      decoded.userId;

    const user =
      await User.findById(
        userId
      ).select("-passwordHash");

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid user",
      });
    }

    res.json({
      success: true,

      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,

        manager_id:
          user.manager_id,

        mobile:
          user.mobile,

        google_email:
          user.google_email,

        store_id:
          user.store_id,

        department_id:
          user.department_id,

        department:
          user.department,

        shift:
          user.shift,

        active:
          user.active,

        language:
          user.language,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
});


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

/*
POST /api/auth/forgot-password

Body:
{
  "email": "example@email.com"
}

For security, this endpoint always returns
the same public message whether or not
the email exists.
*/

router.post(
  "/forgot-password",
  async (req, res) => {
    try {
      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Email is required",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      /*
       * Do not reveal whether the
       * account exists.
       */
      if (!user) {
        return res.json({
          success: true,
          message:
            "If an account exists with that email, you will receive a password reset link shortly.",
        });
      }

      /*
       * Generate a random reset token.
       *
       * Raw token is NOT stored in MongoDB.
       * Only SHA-256 hash is stored.
       */
      const rawToken =
        crypto
          .randomBytes(32)
          .toString("hex");

      const hashedToken =
        crypto
          .createHash("sha256")
          .update(rawToken)
          .digest("hex");

      /*
       * Reset link valid for 30 minutes.
       */
      const expiresAt =
        new Date(
          Date.now() +
            30 * 60 * 1000
        );

      user.resetPasswordToken =
        hashedToken;

      user.resetPasswordExpiresAt =
        expiresAt;

      await user.save();

      /*
       * IMPORTANT:
       *
       * Email sending is not configured yet.
       *
       * We return a development reset URL
       * only when NODE_ENV is not production.
       *
       * Once SMTP/email provider is added,
       * this raw token should be sent by email
       * instead of returning it.
       */
      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      const resetUrl =
        `${frontendUrl}/reset-password?token=${rawToken}`;

      const response = {
        success: true,

        message:
          "If an account exists with that email, you will receive a password reset link shortly.",
      };

      /*
       * Development helper.
       * This lets us test the complete flow
       * before connecting an email provider.
       */
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        response.resetUrl =
          resetUrl;

        response.resetToken =
          rawToken;
      }

      return res.json(response);
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      /*
       * Do not expose internal
       * reset-system errors.
       */
      return res.json({
        success: true,
        message:
          "If an account exists with that email, you will receive a password reset link shortly.",
      });
    }
  }
);


/* =========================================================
   RESET PASSWORD
   ========================================================= */

/*
POST /api/auth/reset-password

Body:
{
  "token": "...",
  "password": "NewPassword123"
}
*/

router.post(
  "/reset-password",
  async (req, res) => {
    try {
      const {
        token,
        password,
      } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Reset token and new password are required",
        });
      }

      if (
        String(password).length <
        6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
      }

      /*
       * Hash incoming token and
       * compare with MongoDB.
       */
      const hashedToken =
        crypto
          .createHash("sha256")
          .update(
            String(token)
          )
          .digest("hex");

      const user =
        await User.findOne({
          resetPasswordToken:
            hashedToken,

          resetPasswordExpiresAt: {
            $gt: new Date(),
          },
        });

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired reset link",
        });
      }

      /*
       * Hash new password.
       */
      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      user.passwordHash =
        passwordHash;

      /*
       * Token can be used only once.
       */
      user.resetPasswordToken =
        "";

      user.resetPasswordExpiresAt =
        null;

      await user.save();

      res.json({
        success: true,
        message:
          "Password reset successfully. You can now log in.",
      });
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to reset password",
      });
    }
  }
);


module.exports = router;