import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import db from "./db.js";

function initialize(passport) {
  const authenticateUser = (email, password, done) => {
    db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          return done(err);
        }

        if (results.rows.length > 0) {
            const user = results.rows[0];

            if (!user.password) {
                return done(null, false, { message: "No password set for this user." });
            }

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    return done(err);
                }
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: "Password is incorrect" });
                }
            });
            } else {
            return done(null, false, {
                message: "No user with that email address"
            });
        }
      }
    );
  };

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      authenticateUser
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser((id, done) => {
    db.query(`SELECT * FROM users WHERE id = $1`, [id], (err, results) => {
      if (err) {
        return done(err);
      }
      return done(null, results.rows[0]);
    });
  });
}

export default initialize;