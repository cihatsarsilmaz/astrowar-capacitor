import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowPath = resolve(
  __dirname,
  "../../.github/workflows/publish.yml"
);

let workflow;

beforeAll(() => {
  workflow = readFileSync(workflowPath, "utf-8");
});

describe(".github/workflows/publish.yml", () => {
  it("exists at the expected path", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("has the expected workflow name", () => {
    expect(workflow).toMatch(/^name:\s*Publish package to GitHub Packages/m);
  });

  it("triggers only on published releases", () => {
    expect(workflow).toMatch(/on:\s*\n\s*release:\s*\n\s*types:\s*\[published\]/);
  });

  it("does not trigger on push, pull_request, or workflow_dispatch", () => {
    expect(workflow).not.toMatch(/^\s*push:/m);
    expect(workflow).not.toMatch(/^\s*pull_request:/m);
    expect(workflow).not.toMatch(/^\s*workflow_dispatch:/m);
  });

  it("defines a publish job running on ubuntu-latest", () => {
    expect(workflow).toMatch(/publish:\s*\n\s*runs-on:\s*ubuntu-latest/);
  });

  it("grants only the minimum required permissions", () => {
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*packages:\s*write/);
  });

  it("does not request write access to contents or other elevated scopes", () => {
    expect(workflow).not.toMatch(/contents:\s*write/);
  });

  it("checks out the repository using actions/checkout@v4", () => {
    expect(workflow).toMatch(/uses:\s*actions\/checkout@v4/);
  });

  it("sets up Node.js 20.x via actions/setup-node@v4", () => {
    expect(workflow).toMatch(/uses:\s*actions\/setup-node@v4/);
    expect(workflow).toMatch(/node-version:\s*['"]20\.x['"]/);
  });

  it("configures the GitHub Packages registry URL for npm", () => {
    expect(workflow).toMatch(
      /registry-url:\s*['"]https:\/\/npm\.pkg\.github\.com['"]/
    );
  });

  it("scopes the npm registry configuration to @cihatsarsilmaz", () => {
    expect(workflow).toMatch(/scope:\s*['"]@cihatsarsilmaz['"]/);
  });

  it("installs dependencies with a clean, reproducible install (npm ci)", () => {
    expect(workflow).toMatch(/run:\s*npm ci/);
  });

  it("builds the project only if a build script is present", () => {
    expect(workflow).toMatch(/run:\s*npm run build --if-present/);
  });

  it("publishes the package via npm publish", () => {
    expect(workflow).toMatch(/run:\s*npm publish/);
  });

  it("authenticates publish using the GITHUB_TOKEN secret, not a hardcoded token", () => {
    expect(workflow).toMatch(
      /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/
    );
  });

  it("does not contain any hardcoded npm or GitHub tokens", () => {
    expect(workflow).not.toMatch(/npm_[A-Za-z0-9]{20,}/);
    expect(workflow).not.toMatch(/gh[ps]_[A-Za-z0-9]{20,}/);
  });

  it("runs steps in the expected order: checkout, setup-node, install, build, publish", () => {
    const order = [
      "actions/checkout@v4",
      "actions/setup-node@v4",
      "npm ci",
      "npm run build --if-present",
      "npm publish",
    ];
    const indices = order.map((token) => workflow.indexOf(token));
    expect(indices).not.toContain(-1);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  it("is well-formed enough that every step line starts with a hyphen list item", () => {
    const stepsBlock = workflow.slice(workflow.indexOf("steps:"));
    const stepLines = stepsBlock
      .split("\n")
      .filter((line) => /^\s*-\s/.test(line));
    expect(stepLines.length).toBeGreaterThanOrEqual(5);
  });
});