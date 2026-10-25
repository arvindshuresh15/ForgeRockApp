import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const issuer = process.env.AM_ISSUER;
const audience = process.env.API_AUDIENCE;
const frontendOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const algorithms = (process.env.JWT_ALGORITHMS || "RS256")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!issuer || !audience) {
  throw new Error("Set AM_ISSUER and API_AUDIENCE in backend/.env");
}
if (algorithms.length === 0) {
  throw new Error("JWT_ALGORITHMS must contain at least one allowed algorithm");
}

app.disable("x-powered-by");
app.use(cors({
  origin: frontendOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
}));
app.use(express.json({ limit: "100kb" }));

const normalizedIssuer = issuer.replace(/\/$/, "");
const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`;

const discoveryResponse = await fetch(discoveryUrl);
if (!discoveryResponse.ok) {
  throw new Error(
    `Could not load AM discovery document (${discoveryResponse.status}) from ${discoveryUrl}`
  );
}

const metadata = await discoveryResponse.json();
if (metadata.issuer !== issuer) {
  throw new Error(
    `AM_ISSUER does not exactly match discovery issuer. Configured: ${issuer}; discovery: ${metadata.issuer}`
  );
}
if (!metadata.jwks_uri) {
  throw new Error("AM discovery document does not contain jwks_uri");
}

const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));

async function authenticateAccessToken(req, res, next) {
  const header = req.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer access token" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing bearer access token" });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience,
      algorithms
    });

    // Keep only verified claims on the request.
    req.identity = payload;
    return next();
  } catch (error) {
    // Do not send token contents or cryptographic error details to the caller.
    console.warn("Access-token validation failed:", {
      code: error.code || "unknown",
      name: error.name || "unknown",
      claim: error.claim,
      reason: error.reason
    });
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", authenticateAccessToken, (req, res) => {
  res.json({
    message: "Access granted",
    subject: req.identity.sub ?? null,
    issuer: req.identity.iss ?? null,
    audience: req.identity.aud ?? null
  });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`API listening at http://127.0.0.1:${port}`);
  console.log(`OIDC issuer: ${issuer}`);
  console.log(`Allowed JWT algorithms: ${algorithms.join(", ")}`);
});
