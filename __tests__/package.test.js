import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const workflowPath = path.join(repoRoot, ".github", "workflows", "publish.yml");

const rawPackageJson = fs.readFileSync(packageJsonPath, "utf-8");
const rawWorkflow = fs.readFileSync(workflowPath, "utf-8");

describe("package.json", () => {
  it("is valid, parseable JSON", () => {
    expect(() => JSON.parse(rawPackageJson)).not.toThrow();
  });

  describe("publishing configuration", () => {
    const pkg = JSON.parse(rawPackageJson);

    it("uses a scoped package name for GitHub Packages", () => {
      expect(pkg.name).toBe("@cihatsarsilmaz/astrogamewar");
    });

    it("has a package name matching the valid npm scoped-package format", () => {
      expect(pkg.name).toMatch(/^@[a-z0-9-]+\/[a-z0-9-._]+$/);
    });

    it("does not mark the package as private", () => {
      expect(pkg.private).not.toBe(true);
      expect(Object.prototype.hasOwnProperty.call(pkg, "private")).toBe(false);
    });

    it("declares a publishConfig pointing at the GitHub Packages registry", () => {
      expect(pkg.publishConfig).toBeDefined();
      expect(pkg.publishConfig.registry).toBe("https://npm.pkg.github.com");
    });

    it("retains a valid semver version string", () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("keeps the module type unaffected", () => {
      expect(pkg.type).toBe("module");
    });
  });

  describe("unrelated fields remain intact", () => {
    const pkg = JSON.parse(rawPackageJson);

    it("still defines all expected npm scripts", () => {
      const expectedScripts = [
        "dev",
        "build",
        "preview",
        "deploy:vercel",
        "deploy:netlify",
        "deploy:gh",
        "android:add",
        "android:sync",
        "android:open",
        "android:build",
      ];
      for (const script of expectedScripts) {
        expect(pkg.scripts).toHaveProperty(script);
        expect(typeof pkg.scripts[script]).toBe("string");
        expect(pkg.scripts[script].length).toBeGreaterThan(0);
      }
    });

    it("still declares its runtime dependencies", () => {
      expect(pkg.dependencies).toMatchObject({
        react: expect.any(String),
        "react-dom": expect.any(String),
        "@capacitor/core": expect.any(String),
        "@capacitor/android": expect.any(String),
      });
    });

    it("still declares its dev dependencies, including vitest", () => {
      expect(pkg.devDependencies).toMatchObject({
        "@capacitor/cli": expect.any(String),
        "@vitejs/plugin-react": expect.any(String),
        vite: expect.any(String),
        vitest: expect.any(String),
      });
    });
  });

  describe("consistency with the publish workflow", () => {
    const pkg = JSON.parse(rawPackageJson);

    it("has a package scope matching the scope configured in the publish workflow", () => {
      const scopeMatch = rawWorkflow.match(/scope:\s*['"]([^'"]+)['"]/);
      expect(scopeMatch).not.toBeNull();
      const [scope] = pkg.name.split("/");
      expect(scope).toBe(scopeMatch[1]);
    });

    it("has a publishConfig registry matching the registry configured in the publish workflow", () => {
      const registryUrlMatch = rawWorkflow.match(/registry-url:\s*['"]([^'"]+)['"]/);
      expect(registryUrlMatch).not.toBeNull();
      expect(pkg.publishConfig.registry).toBe(registryUrlMatch[1]);
    });
  });
});