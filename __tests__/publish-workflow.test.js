import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "publish.yml");

const raw = fs.readFileSync(workflowPath, "utf-8");

describe(".github/workflows/publish.yml", () => {
  it("exists and is non-empty", () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
    expect(raw.trim().length).toBeGreaterThan(0);
  });

  it("has the expected workflow name", () => {
    expect(raw).toMatch(/^name:\s*Publish package to GitHub Packages\s*$/m);
  });

  describe("trigger", () => {
    it("triggers on release published events", () => {
      expect(raw).toMatch(/on:\s*\n\s*release:\s*\n\s*types:\s*\[published\]/);
    });

    it("does not trigger on push or manual dispatch", () => {
      const onBlock = raw.slice(raw.indexOf("on:"), raw.indexOf("jobs:"));
      expect(onBlock).not.toMatch(/push:/);
      expect(onBlock).not.toMatch(/workflow_dispatch:/);
      expect(onBlock).not.toMatch(/pull_request:/);
    });
  });

  describe("publish job", () => {
    it("runs on ubuntu-latest", () => {
      expect(raw).toMatch(/runs-on:\s*ubuntu-latest/);
    });

    it("grants least-privilege permissions", () => {
      expect(raw).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*packages:\s*write/);
    });

    it("checks out the repository", () => {
      expect(raw).toMatch(/uses:\s*actions\/checkout@v4/);
    });

    it("sets up Node.js 20.x targeting the GitHub Packages registry with the correct scope", () => {
      expect(raw).toMatch(/uses:\s*actions\/setup-node@v4/);
      expect(raw).toMatch(/node-version:\s*['"]20\.x['"]/);
      expect(raw).toMatch(/registry-url:\s*['"]https:\/\/npm\.pkg\.github\.com['"]/);
      expect(raw).toMatch(/scope:\s*['"]@cihatsarsilmaz['"]/);
    });

    it("installs dependencies with a clean, reproducible install", () => {
      expect(raw).toMatch(/run:\s*npm ci/);
    });

    it("builds the project only if a build script is present", () => {
      expect(raw).toMatch(/run:\s*npm run build --if-present/);
    });

    it("publishes the package via npm publish", () => {
      expect(raw).toMatch(/run:\s*npm publish/);
    });

    it("authenticates the publish step using the GITHUB_TOKEN secret, not a literal token", () => {
      expect(raw).toMatch(/NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
      // Guard against accidentally hardcoded personal access tokens (e.g. ghp_..., github_pat_...)
      expect(raw).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
      expect(raw).not.toMatch(/github_pat_[A-Za-z0-9_]{20,}/);
    });

    it("scopes the NODE_AUTH_TOKEN env var to the publish step only", () => {
      const publishStepIndex = raw.indexOf("npm publish");
      const envIndex = raw.indexOf("NODE_AUTH_TOKEN");
      expect(publishStepIndex).toBeGreaterThan(-1);
      expect(envIndex).toBeGreaterThan(publishStepIndex);
    });

    it("declares steps in the correct order: checkout, setup-node, install, build, publish", () => {
      const order = [
        "actions/checkout@v4",
        "actions/setup-node@v4",
        "npm ci",
        "npm run build --if-present",
        "npm publish",
      ].map((token) => raw.indexOf(token));

      expect(order.every((index) => index !== -1)).toBe(true);
      for (let i = 1; i < order.length; i++) {
        expect(order[i]).toBeGreaterThan(order[i - 1]);
      }
    });
  });

  describe("regression and boundary checks", () => {
    it("defines exactly one job in the workflow", () => {
      const jobMatches = raw.match(/^\s{2}publish:\s*$/gm);
      expect(jobMatches).toHaveLength(1);
    });

    it("declares NODE_AUTH_TOKEN exactly once, not at the workflow or job level", () => {
      const matches = raw.match(/NODE_AUTH_TOKEN/g);
      expect(matches).toHaveLength(1);
    });

    it("does not request broader permissions than contents:read and packages:write", () => {
      const permissionsBlock = raw.slice(
        raw.indexOf("permissions:"),
        raw.indexOf("steps:"),
      );
      expect(permissionsBlock).not.toMatch(/contents:\s*write/);
      expect(permissionsBlock).not.toMatch(/id-token:/);
      expect(permissionsBlock).not.toMatch(/actions:\s*write/);
    });

    it("does not publish with the --access flag or a dry-run", () => {
      expect(raw).not.toMatch(/npm publish[^\n]*--access/);
      expect(raw).not.toMatch(/npm publish[^\n]*--dry-run/);
    });
  });
});