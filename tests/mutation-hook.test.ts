import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Scenario tests verifying the useMutationWithToast hook
 * is properly used across page components.
 */

const PAGES_DIR = path.resolve(__dirname, "../client/src/pages");
const HOOKS_DIR = path.resolve(__dirname, "../client/src/hooks");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

describe("useMutationWithToast Hook", () => {
  describe("hook implementation", () => {
    const hookContent = readFile(path.join(HOOKS_DIR, "use-mutation-with-toast.ts"));

    it("exports the useMutationWithToast function", () => {
      expect(hookContent).toContain("export function useMutationWithToast");
    });

    it("uses useMutation from tanstack", () => {
      expect(hookContent).toContain('from "@tanstack/react-query"');
      expect(hookContent).toContain("useMutation");
    });

    it("handles query invalidation", () => {
      expect(hookContent).toContain("invalidateQueries");
      expect(hookContent).toContain("invalidateKeys");
    });

    it("handles success toast messages", () => {
      expect(hookContent).toContain("successMessage");
      expect(hookContent).toContain("toast");
    });

    it("handles error toast with destructive variant by default", () => {
      expect(hookContent).toContain("destructive");
    });

    it("supports custom onSuccess callback", () => {
      expect(hookContent).toContain("onSuccess");
    });

    it("supports custom onError callback", () => {
      expect(hookContent).toContain("onError");
    });
  });

  describe("adoption in page components", () => {
    const pages = [
      { name: "agent-detail.tsx", mutations: ["runMutation", "toggleMutation", "deleteMutation"] },
      { name: "templates.tsx", mutations: ["useTemplateMutation"] },
      { name: "template-detail.tsx", mutations: ["useTemplateMutation"] },
      { name: "skills.tsx", mutations: ["installMutation"] },
      { name: "repos.tsx", mutations: ["syncMutation"] },
      { name: "agent-builder.tsx", mutations: ["saveMutation"] },
    ];

    for (const { name, mutations } of pages) {
      describe(name, () => {
        const content = readFile(path.join(PAGES_DIR, name));

        it("imports useMutationWithToast", () => {
          expect(content).toContain("useMutationWithToast");
          expect(content).toContain('from "@/hooks/use-mutation-with-toast"');
        });

        for (const mutation of mutations) {
          it(`uses useMutationWithToast for ${mutation}`, () => {
            expect(content).toContain(`${mutation} = useMutationWithToast`);
          });
        }

        it("does not import useMutation directly from tanstack (except as needed)", () => {
          // Pages using useMutationWithToast should not also import useMutation
          const importLine = content.match(/import\s*{[^}]*}\s*from\s*["']@tanstack\/react-query["']/);
          if (importLine) {
            // If they import from tanstack, it should only be useQuery, not useMutation
            expect(importLine[0]).not.toContain("useMutation");
          }
        });
      });
    }
  });
});
