import pkg from "pg";
const { Client } = pkg;

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "4444",
  port: 5432,
});
db.connect();

export default db;