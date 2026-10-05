const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RolePermission = require("../models/RolePermission");
const Invitation = require("../models/Invitation");
const { requireAuth, requireRoles } = require("../middleware/auth");

const router = express.Router();
const ROLE_OPTIONS = ["owner", "admin", "mis", "manager", "tailoring_manager", "tailoring_operator"];

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

// Admin/owner user list
router.get("/", requireAuth, requireRoles("owner", "admin"), async (req, res) => {
  try {
    const items = await User.find({}).select("-passwordHash").sort({ createdAt: -1 }).lean();
    res.json({ success: true, items: items.map(publicUser) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create an invited user and persist the selected role permissions.
// Email delivery can be added later; the returned temporary password is shown once in the UI.
router.post("/invite", requireAuth, requireRoles("owner", "admin"), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const role = String(req.body.role || "manager");
    const matrix = req.body.matrix || {};

    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    if (!ROLE_OPTIONS.includes(role) || role === "owner") return res.status(400).json({ success: false, message: "Invalid role" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: "A user with this email already exists" });

    const temporaryPassword = crypto.randomBytes(6).toString("base64url").slice(0, 10) + "!1";
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await User.create({
      email,
      passwordHash,
      name,
      role,
      active: true,
      language: "en",
    });

    await RolePermission.findOneAndUpdate(
      { role },
      {
        $set: {
          matrix,
          modules: Object.keys(matrix).filter((key) => matrix[key]?.read),
        },
        $setOnInsert: { can_assign_cross_department: false },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await Invitation.create({
      email,
      role,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedBy: req.user._id,
      used: false,
    }).catch(() => null);

    res.status(201).json({
      success: true,
      item: publicUser(user),
      temporaryPassword,
      inviteToken: token,
      message: "User invited successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", requireAuth, requireRoles("owner", "admin"), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const role = String(req.body.role || "manager");
    const password = String(req.body.password || "Klassic@123");
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    if (!ROLE_OPTIONS.includes(role) || role === "owner") return res.status(400).json({ success: false, message: "Invalid role" });
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      name,
      role,
      mobile: req.body.mobile || "",
      store_id: req.body.store_id || "",
      department_id: req.body.department_id || "",
      department: req.body.department || "",
      shift: req.body.shift || "General",
      language: req.body.language || "en",
      active: true,
    });
    res.status(201).json({ success: true, item: publicUser(user), temporaryPassword: password });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/:id", requireAuth, requireRoles("owner", "admin"), async (req, res) => {
  try {
    const allowed = ["name", "role", "mobile", "google_email", "store_id", "department_id", "department", "shift", "active", "language"];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    if (update.role && (!ROLE_OPTIONS.includes(update.role) || update.role === "owner")) return res.status(400).json({ success: false, message: "Invalid role" });
    if (req.body.password) update.passwordHash = await bcrypt.hash(String(req.body.password), 10);

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select("-passwordHash");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, item: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", requireAuth, requireRoles("owner", "admin"), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Existing authentication endpoints
router.post("/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const name = String(req.body.name || "").trim();
    const role = ROLE_OPTIONS.includes(req.body.role) ? req.body.role : "manager";
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: "User already exists" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, role, active: true });
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });
    if (!user || user.active === false) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const token = jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

module.exports = router;
