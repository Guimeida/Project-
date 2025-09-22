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

app.get("/home", async (req, res) => {
  const results = await db.query("SELECT * FROM items ORDER BY id ASC");
  res.render("home.ejs", {
    listTitle: "Things to do",
    listItems: results.rows, // <-- use results.rows
  });
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
      console.log(results.rows);

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
            console.log(results.rows);
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

app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  await db.query("INSERT INTO items (title) VALUES ($1)", [item]);
  res.redirect("/home");
});

app.post("/edit", async (req, res) => {
  const item = req.body.updatedItemTitle;  
  const id = req.body.updatedItemId;
  await db.query("UPDATE items SET title = $1 WHERE id = $2", [item, id]);
  res.redirect("/home");
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  await db.query("DELETE FROM items WHERE id = $1", [id]);
  res.redirect("/home");
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
