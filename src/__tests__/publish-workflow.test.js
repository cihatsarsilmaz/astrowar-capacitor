import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(
  __dirname,
  "../../.github/workflows/publish.yml",
);
const workflow = readFileSync(workflowPath, "utf-8");

describe(".github/workflows/publish.yml", () => {
  it("has a descriptive workflow name", () => {
    expect(workflow).toMatch(/^name:\s*Publish package to GitHub Packages/m);
  });

  describe("trigger", () => {
    it("runs only on published releases", () => {
      expect(workflow).toMatch(/on:\s*\n\s*release:\s*\n\s*types:\s*\[published\]/);
    });

    it("does not trigger on push events", () => {
      expect(workflow).not.toMatch(/on:[\s\S]*?push:/);
    });
  });

  describe("publish job", () => {
    it("defines a publish job running on ubuntu-latest", () => {
      expect(workflow).toMatch(/publish:\s*\n\s*runs-on:\s*ubuntu-latest/);
    });

    it("grants read access to contents and write access to packages", () => {
      expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read\s*\n\s*packages:\s*write/);
    });

    it("checks out the repository", () => {
      expect(workflow).toContain("uses: actions/checkout@v4");
    });

    it("sets up Node.js 20.x pointed at the GitHub Packages registry", () => {
      expect(workflow).toContain("uses: actions/setup-node@v4");
      expect(workflow).toMatch(/node-version:\s*'20\.x'/);
      expect(workflow).toMatch(/registry-url:\s*'https:\/\/npm\.pkg\.github\.com'/);
    });

    it("scopes setup-node to the @cihatsarsilmaz org", () => {
      expect(workflow).toMatch(/scope:\s*'@cihatsarsilmaz'/);
    });

    it("installs dependencies with npm ci", () => {
      expect(workflow).toContain("run: npm ci");
    });

    it("builds the project only if a build script is present", () => {
      expect(workflow).toContain("run: npm run build --if-present");
    });

    it("publishes the package", () => {
      expect(workflow).toContain("run: npm publish");
    });

    it("authenticates npm publish using the GITHUB_TOKEN secret", () => {
      expect(workflow).toMatch(
        /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/,
      );
    });
  });

  describe("step ordering", () => {
    it("runs checkout before setup-node, install, build, and publish", () => {
      const checkoutIdx = workflow.indexOf("uses: actions/checkout@v4");
      const setupNodeIdx = workflow.indexOf("uses: actions/setup-node@v4");
      const npmCiIdx = workflow.indexOf("run: npm ci");
      const buildIdx = workflow.indexOf("run: npm run build");
      const publishIdx = workflow.indexOf("run: npm publish");

      expect(checkoutIdx).toBeGreaterThan(-1);
      expect(setupNodeIdx).toBeGreaterThan(checkoutIdx);
      expect(npmCiIdx).toBeGreaterThan(setupNodeIdx);
      expect(buildIdx).toBeGreaterThan(npmCiIdx);
      expect(publishIdx).toBeGreaterThan(buildIdx);
    });
  });
});