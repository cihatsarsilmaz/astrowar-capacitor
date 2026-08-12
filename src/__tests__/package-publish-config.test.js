import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

describe("package.json publish configuration", () => {
  it("is valid, parseable JSON", () => {
    expect(packageJson).toBeTypeOf("object");
  });

  it("uses the scoped package name required for GitHub Packages", () => {
    expect(packageJson.name).toBe("@cihatsarsilmaz/astrogamewar");
  });

  it("has a name matching the npm scoped-package pattern (@scope/name)", () => {
    expect(packageJson.name).toMatch(/^@[a-z0-9-]+\/[a-z0-9._-]+$/);
  });

  it("does not mark the package as private (required for publishing)", () => {
    expect(packageJson.private).toBeUndefined();
  });

  it("declares a publishConfig pointing at the GitHub Packages registry", () => {
    expect(packageJson.publishConfig).toEqual({
      registry: "https://npm.pkg.github.com",
    });
  });

  it("keeps the registry scheme secure (https)", () => {
    expect(packageJson.publishConfig.registry).toMatch(/^https:\/\//);
  });

  it("preserves the existing version", () => {
    expect(packageJson.version).toBe("1.0.0");
  });

  it("preserves the ES module type", () => {
    expect(packageJson.type).toBe("module");
  });

  it("still exposes a build script (used by the publish workflow)", () => {
    expect(packageJson.scripts).toHaveProperty("build");
    expect(packageJson.scripts.build).toBe("vite build");
  });

  it("preserves all pre-existing scripts", () => {
    expect(Object.keys(packageJson.scripts)).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it("has a package scope that matches the publish workflow's configured scope", () => {
    const workflowPath = resolve(
      __dirname,
      "../../.github/workflows/publish.yml"
    );
    const workflow = readFileSync(workflowPath, "utf-8");
    const scopeMatch = workflow.match(/scope:\s*['"]?(@[a-z0-9-]+)['"]?/);
    expect(scopeMatch).not.toBeNull();

    const [packageScope] = packageJson.name.split("/");
    expect(packageScope).toBe(scopeMatch[1]);
  });

  it("has a registry that matches the publish workflow's configured registry-url", () => {
    const workflowPath = resolve(
      __dirname,
      "../../.github/workflows/publish.yml"
    );
    const workflow = readFileSync(workflowPath, "utf-8");
    const registryMatch = workflow.match(
      /registry-url:\s*['"]?(https?:\/\/\S+?)['"]?\s*$/m
    );
    expect(registryMatch).not.toBeNull();
    expect(packageJson.publishConfig.registry).toBe(registryMatch[1]);
  });
});