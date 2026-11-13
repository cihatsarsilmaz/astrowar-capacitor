import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const workflow = readFileSync(
  path.resolve(here, "../../.github/workflows/deploy-functions.yml"),
  "utf8",
);

function stepBlock(name) {
  const start = workflow.indexOf(`      - name: ${name}\n`);
  expect(start, `Missing step: ${name}`).toBeGreaterThanOrEqual(0);
  const next = workflow.indexOf("      - name: ", start + 1);
  return workflow.slice(start, next === -1 ? undefined : next);
}

describe("Firebase deployment workflow safeguards", () => {
  it("skips validation if Firebase credentials are missing", () => {
    expect(stepBlock("Validate Firebase deployment configuration"))
      .toContain("if: steps.firebase-config.outputs.enabled == 'true'");
  });

  it("skips deployment if Firebase credentials are missing", () => {
    expect(stepBlock("Deploy to Firebase"))
      .toContain("if: steps.firebase-config.outputs.enabled == 'true'");
  });

  it("does not trigger Firebase deployment on pull requests", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("  pull_request:");
  });
});
