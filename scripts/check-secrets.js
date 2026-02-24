#!/usr/bin/env node
/**
 * Pre-commit secret scanner
 * Blocks commits containing hardcoded secrets / credentials.
 * Zero external dependencies — runs via Node.js.
 */

const { execSync } = require("child_process");

// ─── Patterns that must never appear in committed code ────────────────────────
const FORBIDDEN_PATTERNS = [
  {
    name: "Supabase hardcoded project URL",
    regex: /https:\/\/[a-z]{20}\.supabase\.co/,
  },
  {
    name: "Supabase / generic JWT token",
    // Matches any long HS256 JWT (Supabase anon/service keys are JWTs)
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{50,}/,
  },
  {
    name: "Stripe live secret key",
    regex: /sk_live_[A-Za-z0-9]{20,}/,
  },
  {
    name: "Stripe live publishable key",
    regex: /pk_live_[A-Za-z0-9]{20,}/,
  },
  {
    name: "Stripe webhook secret (hardcoded)",
    regex: /whsec_[A-Za-z0-9]{30,}/,
  },
  {
    name: "Generic API secret (assignment)",
    // e.g.  apiKey = "sk-abc123..."  but NOT in .example files
    regex:
      /(?:api_?key|secret_?key|access_?token)\s*=\s*["'][a-zA-Z0-9_\-]{20,}["']/i,
  },
];

// ─── Files/paths that are explicitly allowed to contain credential-like strings ─
const ALLOWLISTED_PATHS = [
  /^env\.example$/,
  /^\.gitleaks\.toml$/,
  /^scripts\/check-secrets\.js$/,
  /^docs\//,
  /^README\.md$/,
];

// ─── Values that are known safe placeholders ──────────────────────────────────
const SAFE_PLACEHOLDER_PATTERNS = [
  /your_supabase/i,
  /your_.*_key/i,
  /placeholder/i,
  /example\.com/i,
  /sk_test_your/i,
  /pk_test_your/i,
  /whsec_your/i,
];

function isAllowlisted(filePath) {
  return ALLOWLISTED_PATHS.some((pattern) => pattern.test(filePath));
}

function containsSafePlaceholder(line) {
  return SAFE_PLACEHOLDER_PATTERNS.some((p) => p.test(line));
}

function getStagedFiles() {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

function getStagedDiff(filePath) {
  try {
    return execSync(`git diff --cached -- "${filePath}"`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

function scan() {
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  /** @type {{ file: string; line: string; lineNumber: number; pattern: string }[]} */
  const violations = [];

  for (const filePath of stagedFiles) {
    if (isAllowlisted(filePath)) continue;

    const diff = getStagedDiff(filePath);
    const lines = diff.split("\n");

    lines.forEach((line, idx) => {
      // Only check added lines (lines starting with +, but not the +++ header)
      if (!line.startsWith("+") || line.startsWith("+++")) return;
      const content = line.slice(1); // strip the leading '+'

      if (containsSafePlaceholder(content)) return;

      for (const { name, regex } of FORBIDDEN_PATTERNS) {
        if (regex.test(content)) {
          violations.push({
            file: filePath,
            line: content.trim(),
            lineNumber: idx + 1,
            pattern: name,
          });
        }
      }
    });
  }

  if (violations.length === 0) {
    console.log("✓ Secret scan passed — no hardcoded credentials detected.");
    process.exit(0);
  }

  console.error("\n╔════════════════════════════════════════════════════╗");
  console.error("║   COMMIT BLOCKED — Hardcoded secret detected      ║");
  console.error("╚════════════════════════════════════════════════════╝\n");

  for (const v of violations) {
    console.error(`  File    : ${v.file}`);
    console.error(`  Pattern : ${v.pattern}`);
    console.error(`  Line    : ${v.line.substring(0, 120)}`);
    console.error("");
  }

  console.error(
    "Fix: Move credentials to .env.local and reference via process.env.",
  );
  console.error(
    "     Never commit real keys — env.example must use placeholder values only.\n",
  );

  process.exit(1);
}

scan();
