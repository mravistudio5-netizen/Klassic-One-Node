const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const permissionRoutes = require("./routes/permissions");
const tailorRoutes = require("./routes/tailor");
const departmentRoutes = require("./routes/departments");
const dashboardRoutes = require("./routes/dashboard");
const taskRoutes = require("./routes/tasks");
const storeRoutes = require("./routes/stores");
const checklistRoutes = require("./routes/checklists");
const sheetRoutes = require("./routes/sheets");
const reportsRoutes = require("./routes/reports");

const app = express();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| JSON BODY PARSER
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| UPLOADS
|--------------------------------------------------------------------------
*/

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Klassic One Backend is running",
  });
});

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/permissions",
  permissionRoutes
);

app.use(
  "/api/tailor",
  tailorRoutes
);

app.use(
  "/api/departments",
  departmentRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/tasks",
  taskRoutes
);

app.use(
  "/api/stores",
  storeRoutes
);

app.use(
  "/api/checklists",
  checklistRoutes
);

app.use(
  "/api/sheets",
  sheetRoutes
);
app.use(
  "/api/reports",
  reportsRoutes
);
/*
|--------------------------------------------------------------------------
| PORT
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| MONGODB CONNECTION
|--------------------------------------------------------------------------
*/

mongoose
  .connect(
    process.env.MONGODB_URI
  )
  .then(() => {
    console.log(
      "MongoDB connected successfully"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `Klassic One Backend running on port ${PORT}`
        );
      }
    );
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:"
    );

    console.error(
      error.message
    );

    process.exit(1);
  });