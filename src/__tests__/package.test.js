import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, "../../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

describe("package.json", () => {
  describe("package name", () => {
    it("is scoped under @cihatsarsilmaz", () => {
      expect(pkg.name).toBe("@cihatsarsilmaz/astrogamewar");
    });

    it("matches the npm scoped package name format", () => {
      expect(pkg.name).toMatch(/^@[a-z0-9-]+\/[a-z0-9-]+$/);
    });
  });

  describe("publishConfig", () => {
    it("declares a publishConfig block", () => {
      expect(pkg.publishConfig).toBeDefined();
      expect(typeof pkg.publishConfig).toBe("object");
    });

    it("points to the GitHub Packages registry", () => {
      expect(pkg.publishConfig.registry).toBe("https://npm.pkg.github.com");
    });
  });

  describe("publishability", () => {
    it("does not set private, so the package can be published", () => {
      expect(pkg.private).toBeUndefined();
    });
  });

  describe("unrelated fields remain intact", () => {
    it("keeps the version field", () => {
      expect(pkg.version).toBe("1.0.0");
    });

    it("keeps type as module", () => {
      expect(pkg.type).toBe("module");
    });

    it("keeps the build script used by the publish workflow", () => {
      expect(pkg.scripts).toHaveProperty("build");
      expect(pkg.scripts.build).toBe("vite build");
    });

    it("keeps existing dependencies untouched", () => {
      expect(pkg.dependencies).toMatchObject({
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      });
    });

    it("keeps existing devDependencies untouched", () => {
      expect(pkg.devDependencies).toHaveProperty("vitest");
    });
  });

  it("is valid JSON with no trailing/parsing issues", () => {
    // JSON.parse above would have already thrown if this file were malformed;
    // this assertion documents that expectation explicitly.
    expect(pkg).toBeTypeOf("object");
  });

  describe("regression and boundary checks", () => {
    it("no longer uses the old unscoped package name", () => {
      expect(pkg.name).not.toBe("astrogamewar");
    });

    it("splits into exactly a scope and a package name segment", () => {
      const segments = pkg.name.split("/");
      expect(segments).toHaveLength(2);
      expect(segments[0]).toBe("@cihatsarsilmaz");
      expect(segments[1]).toBe("astrogamewar");
    });

    it("does not declare a second, conflicting registry under publishConfig", () => {
      expect(Object.keys(pkg.publishConfig)).toEqual(["registry"]);
    });
  });
});