import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const issueTemplateDir = path.resolve(__dirname, "../../.github/ISSUE_TEMPLATE");

const config = readFileSync(path.join(issueTemplateDir, "config.yml"), "utf-8");
const bugTemplate = readFileSync(path.join(issueTemplateDir, "bug_report.yml"), "utf-8");
const featureTemplate = readFileSync(path.join(issueTemplateDir, "feature_request.yml"), "utf-8");

describe("issue templates", () => {
  it("disables blank issue creation", () => {
    expect(config).toMatch(/blank_issues_enabled:\s*false/);
  });

  it("defines a discussions contact link", () => {
    expect(config).toMatch(/contact_links:/);
    expect(config).toMatch(/discussions/i);
  });

  it("requires essential fields in bug report template", () => {
    expect(bugTemplate).toMatch(/name:\s*Bug Report/);
    expect(bugTemplate).toMatch(/id:\s*summary/);
    expect(bugTemplate).toMatch(/id:\s*steps/);
    expect(bugTemplate).toMatch(/required:\s*true/g);
  });

  it("requires essential fields in feature request template", () => {
    expect(featureTemplate).toMatch(/name:\s*Feature Request/);
    expect(featureTemplate).toMatch(/id:\s*problem/);
    expect(featureTemplate).toMatch(/id:\s*proposal/);
    expect(featureTemplate).toMatch(/required:\s*true/g);
  });
});
