const crypto = require("crypto");
const db = require("../models/database");

const COOKIE_NAME = "studyflow_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionCookie(value, maxAge = SESSION_SECONDS) {
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=${secure ? "None" : "Lax"}${secure ? "; Secure" : ""}`;
}

function sessionToken(req) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => {
        const [name, ...value] = part.trim().split("=");
        return [name, value.join("=")];
      })
      .filter(([name]) => name),
  );
  return cookies[COOKIE_NAME] || null;
}

function createSession(res, studentId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  db.prepare("DELETE FROM auth_sessions WHERE expiresAt <= ?").run(
    new Date().toISOString(),
  );
  db.prepare(
    "INSERT INTO auth_sessions (tokenHash, studentId, expiresAt) VALUES (?, ?, ?)",
  ).run(tokenHash(token), studentId, expiresAt);
  res.setHeader("Set-Cookie", sessionCookie(token));
}

function destroySession(req, res) {
  const token = sessionToken(req);
  if (token)
    db.prepare("DELETE FROM auth_sessions WHERE tokenHash = ?").run(
      tokenHash(token),
    );
  res.setHeader("Set-Cookie", sessionCookie("", 0));
}

function authenticate(req, res, next) {
  const token = sessionToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const student = db
    .prepare(
      `
    SELECT s.*
    FROM auth_sessions a
    JOIN students s ON s.id = a.studentId
    WHERE a.tokenHash = ? AND a.expiresAt > ?
  `,
    )
    .get(tokenHash(token), new Date().toISOString());

  if (!student) {
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    return res.status(401).json({ error: "Authentication required" });
  }

  req.student = student;
  next();
}

module.exports = { authenticate, createSession, destroySession };
