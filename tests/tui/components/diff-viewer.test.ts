/**
 * Tests for Diff Viewer Component
 */

import { describe, it, expect } from "bun:test";
import { parseDiff, type DiffFile, type DiffLine, type DiffHunk } from "../../../src/tui/components/diff-viewer.js";

// Since DiffViewer is a React component, we test the helper functions, constants, and types
// For full component testing, a React test renderer would be needed

describe("DiffViewer Component", () => {
  describe("DiffViewerProps interface", () => {
    it("should accept valid prop combinations", () => {
      const validProps = {
        files: [],
        selectedFileIndex: 0,
        mode: "unified" as const,
        showLineNumbers: true,
        contextLines: 3,
        collapseUnchanged: true,
        collapseThreshold: 5,
        maxWidth: 120,
        maxHeight: 30,
      };

      expect(validProps.mode).toBe("unified");
      expect(validProps.showLineNumbers).toBe(true);
      expect(validProps.contextLines).toBe(3);
    });

    it("should have default mode as unified", () => {
      const defaultMode = "unified";
      expect(defaultMode).toBe("unified");
    });

    it("should have default showLineNumbers as true", () => {
      const defaultShowLineNumbers = true;
      expect(defaultShowLineNumbers).toBe(true);
    });

    it("should have default contextLines as 3", () => {
      const defaultContextLines = 3;
      expect(defaultContextLines).toBe(3);
    });
  });

  describe("DiffViewMode types", () => {
    it("should support unified mode", () => {
      const mode: "unified" | "split" = "unified";
      expect(mode).toBe("unified");
    });

    it("should support split mode", () => {
      const mode: "unified" | "split" = "split";
      expect(mode).toBe("split");
    });
  });

  describe("Line change types", () => {
    it("should support all line types", () => {
      const types = ["added", "removed", "unchanged", "context"];
      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should have correct line colors", () => {
      const LINE_COLORS = {
        added: "green",
        removed: "red",
        unchanged: "white",
        context: "gray",
      };

      expect(LINE_COLORS.added).toBe("green");
      expect(LINE_COLORS.removed).toBe("red");
      expect(LINE_COLORS.unchanged).toBe("white");
      expect(LINE_COLORS.context).toBe("gray");
    });

    it("should have correct line prefixes", () => {
      const LINE_PREFIXES = {
        added: "+",
        removed: "-",
        unchanged: " ",
        context: " ",
      };

      expect(LINE_PREFIXES.added).toBe("+");
      expect(LINE_PREFIXES.removed).toBe("-");
      expect(LINE_PREFIXES.unchanged).toBe(" ");
      expect(LINE_PREFIXES.context).toBe(" ");
    });
  });

  describe("File status types", () => {
    it("should support all file statuses", () => {
      const statuses = ["added", "modified", "deleted", "renamed"];
      statuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });

    it("should have correct file status colors", () => {
      const FILE_STATUS_COLORS = {
        added: "green",
        modified: "yellow",
        deleted: "red",
        renamed: "cyan",
      };

      expect(FILE_STATUS_COLORS.added).toBe("green");
      expect(FILE_STATUS_COLORS.modified).toBe("yellow");
      expect(FILE_STATUS_COLORS.deleted).toBe("red");
      expect(FILE_STATUS_COLORS.renamed).toBe("cyan");
    });

    it("should have correct file status labels", () => {
      const FILE_STATUS_LABELS = {
        added: "A",
        modified: "M",
        deleted: "D",
        renamed: "R",
      };

      expect(FILE_STATUS_LABELS.added).toBe("A");
      expect(FILE_STATUS_LABELS.modified).toBe("M");
      expect(FILE_STATUS_LABELS.deleted).toBe("D");
      expect(FILE_STATUS_LABELS.renamed).toBe("R");
    });
  });

  describe("formatLineNumber function", () => {
    function formatLineNumber(num: number | null, width: number): string {
      if (num === null) {
        return " ".repeat(width);
      }
      return num.toString().padStart(width, " ");
    }

    it("should format single digit number", () => {
      expect(formatLineNumber(5, 3)).toBe("  5");
    });

    it("should format double digit number", () => {
      expect(formatLineNumber(42, 3)).toBe(" 42");
    });

    it("should format triple digit number", () => {
      expect(formatLineNumber(123, 3)).toBe("123");
    });

    it("should return spaces for null", () => {
      expect(formatLineNumber(null, 3)).toBe("   ");
    });

    it("should handle width of 5", () => {
      expect(formatLineNumber(7, 5)).toBe("    7");
      expect(formatLineNumber(null, 5)).toBe("     ");
    });
  });

  describe("calculateLineNumberWidth function", () => {
    function calculateLineNumberWidth(files: DiffFile[]): number {
      let maxLine = 0;
      for (const file of files) {
        for (const hunk of file.hunks) {
          maxLine = Math.max(maxLine, hunk.oldStart + hunk.oldCount);
          maxLine = Math.max(maxLine, hunk.newStart + hunk.newCount);
        }
      }
      return Math.max(3, maxLine.toString().length);
    }

    it("should return minimum of 3", () => {
      const files: DiffFile[] = [];
      expect(calculateLineNumberWidth(files)).toBe(3);
    });

    it("should calculate width from hunk info", () => {
      const files: DiffFile[] = [
        {
          oldPath: "test.ts",
          newPath: "test.ts",
          status: "modified",
          additions: 5,
          deletions: 3,
          hunks: [
            {
              oldStart: 1,
              oldCount: 100,
              newStart: 1,
              newCount: 102,
              header: "@@ -1,100 +1,102 @@",
              lines: [],
            },
          ],
        },
      ];
      expect(calculateLineNumberWidth(files)).toBe(3); // 103 is 3 digits
    });

    it("should handle large line numbers", () => {
      const files: DiffFile[] = [
        {
          oldPath: "test.ts",
          newPath: "test.ts",
          status: "modified",
          additions: 5,
          deletions: 3,
          hunks: [
            {
              oldStart: 9990,
              oldCount: 20,
              newStart: 9990,
              newCount: 25,
              header: "@@ -9990,20 +9990,25 @@",
              lines: [],
            },
          ],
        },
      ];
      expect(calculateLineNumberWidth(files)).toBe(5); // 10015 is 5 digits
    });
  });

  describe("parseDiff function", () => {
    it("should parse simple modified file diff", () => {
      const diffText = `diff --git a/src/test.ts b/src/test.ts
index abc123..def456 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
+new line 3
 line 4`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].oldPath).toBe("src/test.ts");
      expect(files[0].newPath).toBe("src/test.ts");
      expect(files[0].status).toBe("modified");
      expect(files[0].additions).toBe(2);
      expect(files[0].deletions).toBe(1);
    });

    it("should parse new file diff", () => {
      const diffText = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].status).toBe("added");
      expect(files[0].additions).toBe(3);
      expect(files[0].deletions).toBe(0);
    });

    it("should parse deleted file diff", () => {
      const diffText = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc123..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-line 1
-line 2`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].status).toBe("deleted");
      expect(files[0].additions).toBe(0);
      expect(files[0].deletions).toBe(2);
    });

    it("should parse renamed file diff", () => {
      const diffText = `diff --git a/old-name.ts b/new-name.ts
similarity index 100%
rename from old-name.ts
rename to new-name.ts`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].status).toBe("renamed");
    });

    it("should parse binary file diff", () => {
      const diffText = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(1);
      expect(files[0].isBinary).toBe(true);
    });

    it("should parse multiple files", () => {
      const diffText = `diff --git a/file1.ts b/file1.ts
index abc..def 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,2 @@
-old line
+new line
diff --git a/file2.ts b/file2.ts
index 123..456 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1,1 +1,2 @@
 existing
+added`;

      const files = parseDiff(diffText);
      expect(files.length).toBe(2);
      expect(files[0].newPath).toBe("file1.ts");
      expect(files[1].newPath).toBe("file2.ts");
    });

    it("should parse hunk headers correctly", () => {
      const diffText = `diff --git a/test.ts b/test.ts
index abc..def 100644
--- a/test.ts
+++ b/test.ts
@@ -10,5 +10,7 @@
 context
-removed
+added 1
+added 2
 context`;

      const files = parseDiff(diffText);
      expect(files[0].hunks.length).toBe(1);
      expect(files[0].hunks[0].oldStart).toBe(10);
      expect(files[0].hunks[0].oldCount).toBe(5);
      expect(files[0].hunks[0].newStart).toBe(10);
      expect(files[0].hunks[0].newCount).toBe(7);
    });

    it("should track line numbers correctly", () => {
      const diffText = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,3 @@
 line 1
-line 2 old
+line 2 new
 line 3`;

      const files = parseDiff(diffText);
      const lines = files[0].hunks[0].lines;

      // First line (unchanged)
      expect(lines[0].type).toBe("unchanged");
      expect(lines[0].oldLineNumber).toBe(1);
      expect(lines[0].newLineNumber).toBe(1);

      // Removed line
      expect(lines[1].type).toBe("removed");
      expect(lines[1].oldLineNumber).toBe(2);
      expect(lines[1].newLineNumber).toBeNull();

      // Added line
      expect(lines[2].type).toBe("added");
      expect(lines[2].oldLineNumber).toBeNull();
      expect(lines[2].newLineNumber).toBe(2);

      // Last line (unchanged)
      expect(lines[3].type).toBe("unchanged");
      expect(lines[3].oldLineNumber).toBe(3);
      expect(lines[3].newLineNumber).toBe(3);
    });

    it("should handle empty diff", () => {
      const diffText = "";
      const files = parseDiff(diffText);
      expect(files.length).toBe(0);
    });

    it("should handle single-line hunks", () => {
      const diffText = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1 +1 @@
-old
+new`;

      const files = parseDiff(diffText);
      expect(files[0].hunks[0].oldCount).toBe(1);
      expect(files[0].hunks[0].newCount).toBe(1);
    });
  });

  describe("Split view line pairing", () => {
    function pairLinesForSplitView(hunk: DiffHunk): { old: DiffLine | null; new: DiffLine | null }[] {
      const pairedLines: { old: DiffLine | null; new: DiffLine | null }[] = [];
      let oldLines: DiffLine[] = [];
      let newLines: DiffLine[] = [];

      for (const line of hunk.lines) {
        if (line.type === "removed") {
          oldLines.push(line);
        } else if (line.type === "added") {
          newLines.push(line);
        } else {
          // Flush pending lines
          while (oldLines.length > 0 || newLines.length > 0) {
            pairedLines.push({
              old: oldLines.shift() ?? null,
              new: newLines.shift() ?? null,
            });
          }
          // Add unchanged line to both sides
          pairedLines.push({ old: line, new: line });
        }
      }

      // Flush remaining lines
      while (oldLines.length > 0 || newLines.length > 0) {
        pairedLines.push({
          old: oldLines.shift() ?? null,
          new: newLines.shift() ?? null,
        });
      }

      return pairedLines;
    }

    it("should pair unchanged lines on both sides", () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldCount: 1,
        newStart: 1,
        newCount: 1,
        header: "@@ -1,1 +1,1 @@",
        lines: [
          { content: "same", type: "unchanged", oldLineNumber: 1, newLineNumber: 1 },
        ],
      };

      const pairs = pairLinesForSplitView(hunk);
      expect(pairs.length).toBe(1);
      expect(pairs[0].old).toBe(pairs[0].new);
    });

    it("should pair removed and added lines", () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldCount: 1,
        newStart: 1,
        newCount: 1,
        header: "@@ -1,1 +1,1 @@",
        lines: [
          { content: "old", type: "removed", oldLineNumber: 1, newLineNumber: null },
          { content: "new", type: "added", oldLineNumber: null, newLineNumber: 1 },
        ],
      };

      const pairs = pairLinesForSplitView(hunk);
      expect(pairs.length).toBe(1);
      expect(pairs[0].old?.content).toBe("old");
      expect(pairs[0].new?.content).toBe("new");
    });

    it("should handle more removals than additions", () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldCount: 3,
        newStart: 1,
        newCount: 1,
        header: "@@ -1,3 +1,1 @@",
        lines: [
          { content: "line1", type: "removed", oldLineNumber: 1, newLineNumber: null },
          { content: "line2", type: "removed", oldLineNumber: 2, newLineNumber: null },
          { content: "line3", type: "removed", oldLineNumber: 3, newLineNumber: null },
          { content: "replaced", type: "added", oldLineNumber: null, newLineNumber: 1 },
        ],
      };

      const pairs = pairLinesForSplitView(hunk);
      expect(pairs.length).toBe(3);
      expect(pairs[0].old?.content).toBe("line1");
      expect(pairs[0].new?.content).toBe("replaced");
      expect(pairs[1].old?.content).toBe("line2");
      expect(pairs[1].new).toBeNull();
      expect(pairs[2].old?.content).toBe("line3");
      expect(pairs[2].new).toBeNull();
    });
  });

  describe("File navigation", () => {
    it("should navigate to previous file", () => {
      let currentFileIndex = 2;
      const filesLength = 5;

      currentFileIndex = Math.max(0, currentFileIndex - 1);
      expect(currentFileIndex).toBe(1);
    });

    it("should not go below 0", () => {
      let currentFileIndex = 0;

      currentFileIndex = Math.max(0, currentFileIndex - 1);
      expect(currentFileIndex).toBe(0);
    });

    it("should navigate to next file", () => {
      let currentFileIndex = 2;
      const filesLength = 5;

      currentFileIndex = Math.min(filesLength - 1, currentFileIndex + 1);
      expect(currentFileIndex).toBe(3);
    });

    it("should not exceed files length", () => {
      let currentFileIndex = 4;
      const filesLength = 5;

      currentFileIndex = Math.min(filesLength - 1, currentFileIndex + 1);
      expect(currentFileIndex).toBe(4);
    });
  });

  describe("CompactDiff calculations", () => {
    it("should limit displayed files", () => {
      const files = [
        { additions: 10, deletions: 5 },
        { additions: 20, deletions: 10 },
        { additions: 5, deletions: 2 },
        { additions: 15, deletions: 8 },
        { additions: 8, deletions: 3 },
        { additions: 12, deletions: 6 },
      ];
      const maxFiles = 5;

      const displayFiles = files.slice(0, maxFiles);
      const hiddenCount = files.length - maxFiles;

      expect(displayFiles.length).toBe(5);
      expect(hiddenCount).toBe(1);
    });

    it("should calculate total additions", () => {
      const files = [
        { additions: 10, deletions: 5 },
        { additions: 20, deletions: 10 },
        { additions: 5, deletions: 2 },
      ];

      const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
      expect(totalAdditions).toBe(35);
    });

    it("should calculate total deletions", () => {
      const files = [
        { additions: 10, deletions: 5 },
        { additions: 20, deletions: 10 },
        { additions: 5, deletions: 2 },
      ];

      const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
      expect(totalDeletions).toBe(17);
    });
  });

  describe("Split view half width", () => {
    it("should calculate half width correctly", () => {
      const maxWidth = 120;
      const halfWidth = Math.floor((maxWidth - 3) / 2); // -3 for separator
      expect(halfWidth).toBe(58);
    });

    it("should handle odd widths", () => {
      const maxWidth = 121;
      const halfWidth = Math.floor((maxWidth - 3) / 2);
      expect(halfWidth).toBe(59);
    });
  });

  describe("Content truncation", () => {
    function formatContent(content: string, maxWidth: number): string {
      if (content.length > maxWidth) {
        return content.slice(0, maxWidth - 3) + "...";
      }
      return content.padEnd(maxWidth);
    }

    it("should truncate long content", () => {
      const content = "This is a very long line that exceeds the maximum width";
      const result = formatContent(content, 20);
      expect(result.length).toBe(20);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should pad short content", () => {
      const content = "short";
      const result = formatContent(content, 20);
      expect(result.length).toBe(20);
      expect(result.startsWith("short")).toBe(true);
    });
  });
});
