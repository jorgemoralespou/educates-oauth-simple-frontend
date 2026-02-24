#!/usr/bin/env node
/**
 * Applies Better Auth SQLite schema to data/auth.db.
 * Safe to run on every container start (uses IF NOT EXISTS).
 * Used in Kubernetes so the pod creates tables on first run without needing the CLI.
 */
const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "auth.db");
const schemaPath = path.join(process.cwd(), "scripts", "better-auth-schema.sql");

if (!fs.existsSync(schemaPath)) {
  console.error("Schema file not found:", schemaPath);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, "utf8");

try {
  const Database = require("better-sqlite3");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.exec(sql);
  db.close();
  console.log("Migration completed successfully");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
