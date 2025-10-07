import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import pkg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import initializePassport from "./passportConfig.js";
import db from "./db.js";
import session from "express-session";
import flash from "connect-flash";


initializePassport(passport);

const app = express();
const port = 3000;

app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: false,
  })
);

export default db;
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(flash());

app.get('/login', checkAuthenticated, (req, res) => {
  res.render("login.ejs", { messages: {} });
});

app.get('/', (req, res) => {
  res.render("login.ejs", { messages: {} });
});

app.get('/register', checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.get("/home", checkNotAuthenticated, async (req, res) => {
  try {
    const tagsResult = await db.query("SELECT * FROM tags ORDER BY name ASC");
    const tags = tagsResult.rows;

    let selectedTags = req.query.tags || [];
    if (typeof selectedTags === "string") {
      selectedTags = [selectedTags];
    }

    let resourcesQuery = `
      SELECT r.*, 
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags
      FROM resources r
      LEFT JOIN resource_tags rt ON r.id = rt.resource_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.user_id = $1
    `;
    const params = [req.user.id];

    if (selectedTags.length > 0) {
      resourcesQuery += ` AND r.id IN (
        SELECT resource_id FROM resource_tags WHERE tag_id = ANY($2::int[])
      )`;
      params.push(selectedTags.map(Number));
    }

    resourcesQuery += " GROUP BY r.id ORDER BY r.created_at DESC";

    const resourcesResult = await db.query(resourcesQuery, params);
    const resources = resourcesResult.rows.map(r => ({
      ...r,
      tags: Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags)
    }));

    const statsResult = await db.query(
      `SELECT progress_status, COUNT(*) FROM resources WHERE user_id = $1 GROUP BY progress_status`,
      [req.user.id]
    );
    const stats = { completed: 0, inProgress: 0, notStarted: 0 };
    statsResult.rows.forEach(row => {
      if (row.progress_status === "Completed") stats.completed = Number(row.count);
      else if (row.progress_status === "In Progress") stats.inProgress = Number(row.count);
      else stats.notStarted += Number(row.count);
    });

    res.render("home.ejs", {
      resources,
      tags,
      selectedTags,
      stats,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/search", checkNotAuthenticated, async (req, res) => {
  try {
    const searchQuery = req.query.q || "";

    const tagsResult = await db.query("SELECT * FROM tags ORDER BY name ASC");
    const tags = tagsResult.rows;

    const resourcesResult = await db.query(
      `
      SELECT r.*, 
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name))
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags
      FROM resources r
      LEFT JOIN resource_tags rt ON r.id = rt.resource_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.user_id = $1 AND r.title ILIKE $2
      GROUP BY r.id
      ORDER BY r.created_at DESC
      `,
      [req.user.id, `%${searchQuery}%`]
    );

    const resources = resourcesResult.rows.map(r => ({
      ...r,
      tags: Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags)
    }));

    const statsResult = await db.query(
      `SELECT progress_status, COUNT(*) FROM resources WHERE user_id = $1 GROUP BY progress_status`,
      [req.user.id]
    );
    const stats = { completed: 0, inProgress: 0, notStarted: 0 };
    statsResult.rows.forEach(row => {
      if (row.progress_status === "Completed") stats.completed = Number(row.count);
      else if (row.progress_status === "In Progress") stats.inProgress = Number(row.count);
      else stats.notStarted += Number(row.count);
    });

    res.render("home.ejs", {
      resources,
      tags,
      selectedTags: [],
      stats,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


app.get("/add", checkNotAuthenticated, async (req, res) => {
  const tagsResult = await db.query("SELECT * FROM tags ORDER BY name ASC");
  const tags = tagsResult.rows;
  res.render("add.ejs", { tags });
});

app.get("/edit/:id", checkNotAuthenticated, async (req, res) => {
  const resourceId = req.params.id;

  const resourceResult = await db.query("SELECT * FROM resources WHERE id = $1", [resourceId]);
  const resource = resourceResult.rows[0];

  const tagsResult = await db.query("SELECT * FROM tags ORDER BY name ASC");
  const tags = tagsResult.rows;

  const resourceTagsResult = await db.query(
    "SELECT tag_id FROM resource_tags WHERE resource_id = $1",
    [resourceId]
  );
  const resourceTagIds = resourceTagsResult.rows.map(row => String(row.tag_id));

  res.render("edit.ejs", { resource, tags, resourceTagIds, user: req.user });
});

app.get("/notes/:id", checkNotAuthenticated, async (req, res) => {
  const resourceId = req.params.id;

  const resourceResult = await db.query("SELECT * FROM resources WHERE id = $1", [resourceId]);
  const resource = resourceResult.rows[0];

  const noteResult = await db.query("SELECT * FROM notes WHERE resource_id = $1", [resourceId]);
  const note = noteResult.rows[0] || { content: "" };

  res.render("notes.ejs", { resource, note, user: req.user });
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You have logged out");
    res.redirect("/login");
  });
});

app.post("/register", async (req, res) => {
  let {name, email, password, password2} = req.body;
  let errors =[];

  if(!name || !email || !password || !password2) {
    errors.push({message: "Please enter all fields"});
  }

  if(password.length < 6) {
    errors.push({message: "Password should be at least 6 characters"});
  }

  if(password !== password2) {
    errors.push({message: "Passwords do not match"});
  }
  
  if(errors.length > 0) {
    res.render("register.ejs", {errors});
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);

    db.query("SELECT * FROM users WHERE email = $1", [email], (err, results) => {
      if(err) {
        throw err;
      }
      if(results.rows.length > 0) {
        errors.push({message: "Email already registered"});
        res.render("register.ejs", {errors});
      } else {
        db.query(
          "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, password",
          [name, email, hashedPassword],
          (err, results) => {
            if(err) {
              throw err;
            }
            req.flash("success_msg", "You are now registered. Please log in");
            res.redirect("/login");
          }
        );
      }
    });
  }
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/home",
  failureRedirect: "/login",
  failureFlash: true
}));

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/home");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect("/login");
}

app.post("/add", checkNotAuthenticated, async (req, res) => {
  try {
    const { title, type, url, description, progress_status, tags } = req.body;
    const userId = req.user.id;

    const resourceResult = await db.query(
      `INSERT INTO resources (user_id, title, type, url, description, progress_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [userId, title, type, url, description, progress_status]
    );
    const resourceId = resourceResult.rows[0].id;

    if (tags) {
      const tagIds = Array.isArray(tags) ? tags : [tags];
      for (const tagId of tagIds) {
        await db.query(
          `INSERT INTO resource_tags (resource_id, tag_id) VALUES ($1, $2)`,
          [resourceId, tagId]
        );
      }
    }

    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding resource");
  }
});

app.post("/edit/:id", checkNotAuthenticated, async (req, res) => {
  const resourceId = req.params.id;
  const { title, type, url, description, progress_status, tags } = req.body;

  await db.query(
    `UPDATE resources
     SET title = $1, type = $2, url = $3, description = $4, progress_status = $5, updated_at = NOW()
     WHERE id = $6`,
    [title, type, url, description, progress_status, resourceId]
  );

  await db.query("DELETE FROM resource_tags WHERE resource_id = $1", [resourceId]);
  if (tags) {
    const tagIds = Array.isArray(tags) ? tags : [tags];
    for (const tagId of tagIds) {
      await db.query(
        "INSERT INTO resource_tags (resource_id, tag_id) VALUES ($1, $2)",
        [resourceId, tagId]
      );
    }
  }

  res.redirect("/home");
});

app.post("/delete/:id", checkNotAuthenticated, async (req, res) => {
  const resourceId = req.params.id;

  await db.query("DELETE FROM resource_tags WHERE resource_id = $1", [resourceId]);

  await db.query("DELETE FROM resources WHERE id = $1", [resourceId]);

  res.redirect("/home");
});

app.post("/notes/:id", checkNotAuthenticated, async (req, res) => {
  const resourceId = req.params.id;
  const { content } = req.body;

  const noteResult = await db.query("SELECT * FROM notes WHERE resource_id = $1", [resourceId]);
  if (noteResult.rows.length > 0) {
    await db.query(
      "UPDATE notes SET content = $1, updated_at = NOW() WHERE resource_id = $2",
      [content, resourceId]
    );
  } else {
    await db.query(
      "INSERT INTO notes (resource_id, content, updated_at) VALUES ($1, $2, NOW())",
      [resourceId, content]
    );
  }

  res.redirect("/home");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
