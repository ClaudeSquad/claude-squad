/**
 * Diff Viewer Component
 *
 * Displays code diffs in unified or split view format.
 * Supports file navigation, syntax highlighting hints,
 * line numbers, and collapsible unchanged regions.
 */

import { useState, useMemo, type ReactNode } from "react";
import {
  PRIMARY_COLORS,
  TEXT_COLORS,
  STATUS_ICONS,
  type TerminalColor,
} from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Diff view mode.
 */
export type DiffViewMode = "unified" | "split";

/**
 * Line change type.
 */
export type LineChangeType = "added" | "removed" | "unchanged" | "context";

/**
 * A single line in a diff.
 */
export interface DiffLine {
  /** Line content */
  content: string;
  /** Change type */
  type: LineChangeType;
  /** Old line number (null for added lines) */
  oldLineNumber: number | null;
  /** New line number (null for removed lines) */
  newLineNumber: number | null;
}

/**
 * A hunk (section) in a diff.
 */
export interface DiffHunk {
  /** Starting line in old file */
  oldStart: number;
  /** Number of lines in old file */
  oldCount: number;
  /** Starting line in new file */
  newStart: number;
  /** Number of lines in new file */
  newCount: number;
  /** Hunk header (e.g., @@ -1,5 +1,7 @@) */
  header: string;
  /** Lines in this hunk */
  lines: DiffLine[];
}

/**
 * A file in a diff.
 */
export interface DiffFile {
  /** File path (old) */
  oldPath: string;
  /** File path (new) */
  newPath: string;
  /** File status */
  status: "added" | "modified" | "deleted" | "renamed";
  /** Number of additions */
  additions: number;
  /** Number of deletions */
  deletions: number;
  /** Diff hunks */
  hunks: DiffHunk[];
  /** Whether the file is binary */
  isBinary?: boolean;
}

/**
 * Props for the DiffViewer component.
 */
export interface DiffViewerProps {
  /** Files to display */
  files: DiffFile[];
  /** Currently selected file index */
  selectedFileIndex?: number;
  /** View mode (default: "unified") */
  mode?: DiffViewMode;
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Context lines to show around changes (default: 3) */
  contextLines?: number;
  /** Whether to collapse unchanged regions (default: true) */
  collapseUnchanged?: boolean;
  /** Minimum lines to collapse (default: 5) */
  collapseThreshold?: number;
  /** Callback when file selection changes */
  onFileSelect?: (index: number) => void;
  /** Callback when view mode changes */
  onModeChange?: (mode: DiffViewMode) => void;
  /** Maximum width for the viewer */
  maxWidth?: number;
  /** Maximum height for the viewer */
  maxHeight?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Colors for diff line types.
 */
const LINE_COLORS: Record<LineChangeType, TerminalColor> = {
  added: "green",
  removed: "red",
  unchanged: "white",
  context: "gray",
};

/**
 * Background colors for diff lines.
 */
const LINE_BG_COLORS: Record<LineChangeType, TerminalColor | undefined> = {
  added: undefined, // No background, just green text
  removed: undefined, // No background, just red text
  unchanged: undefined,
  context: undefined,
};

/**
 * Line prefix characters.
 */
const LINE_PREFIXES: Record<LineChangeType, string> = {
  added: "+",
  removed: "-",
  unchanged: " ",
  context: " ",
};

/**
 * File status colors.
 */
const FILE_STATUS_COLORS: Record<DiffFile["status"], TerminalColor> = {
  added: "green",
  modified: "yellow",
  deleted: "red",
  renamed: "cyan",
};

/**
 * File status labels.
 */
const FILE_STATUS_LABELS: Record<DiffFile["status"], string> = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a line number with padding.
 */
function formatLineNumber(num: number | null, width: number): string {
  if (num === null) {
    return " ".repeat(width);
  }
  return num.toString().padStart(width, " ");
}

/**
 * Calculate the width needed for line numbers.
 */
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

/**
 * Parse a unified diff string into DiffFile objects.
 */
export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split("\n");
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // File header: diff --git a/path b/path
    if (line.startsWith("diff --git")) {
      if (currentFile) {
        files.push(currentFile);
      }
      const match = line.match(/diff --git a\/(.+) b\/(.+)/);
      currentFile = {
        oldPath: match?.[1] ?? "",
        newPath: match?.[2] ?? "",
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      currentHunk = null;
      continue;
    }

    // New file mode
    if (line.startsWith("new file mode") && currentFile) {
      currentFile.status = "added";
      continue;
    }

    // Deleted file mode
    if (line.startsWith("deleted file mode") && currentFile) {
      currentFile.status = "deleted";
      continue;
    }

    // Rename detection
    if (line.startsWith("rename from") && currentFile) {
      currentFile.status = "renamed";
      continue;
    }

    // Binary file
    if (line.startsWith("Binary files") && currentFile) {
      currentFile.isBinary = true;
      continue;
    }

    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(
      /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/
    );
    if (hunkMatch && currentFile) {
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: parseInt(hunkMatch[2] ?? "1", 10),
        newStart: parseInt(hunkMatch[3], 10),
        newCount: parseInt(hunkMatch[4] ?? "1", 10),
        header: line,
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      oldLine = currentHunk.oldStart;
      newLine = currentHunk.newStart;
      continue;
    }

    // Diff lines
    if (currentHunk) {
      if (line.startsWith("+")) {
        currentHunk.lines.push({
          content: line.slice(1),
          type: "added",
          oldLineNumber: null,
          newLineNumber: newLine++,
        });
        if (currentFile) currentFile.additions++;
      } else if (line.startsWith("-")) {
        currentHunk.lines.push({
          content: line.slice(1),
          type: "removed",
          oldLineNumber: oldLine++,
          newLineNumber: null,
        });
        if (currentFile) currentFile.deletions++;
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({
          content: line.slice(1) || "",
          type: "unchanged",
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}

// ============================================================================
// Sub-components
// ============================================================================

interface FileHeaderProps {
  file: DiffFile;
  isSelected: boolean;
}

/**
 * File header with path and stats.
 */
function FileHeader({ file, isSelected }: FileHeaderProps) {
  const statusColor = FILE_STATUS_COLORS[file.status];
  const statusLabel = FILE_STATUS_LABELS[file.status];

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      backgroundColor={isSelected ? "blue" : undefined}
    >
      {/* File path */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg={statusColor}>[{statusLabel}]</span>
        </text>
        <text>
          <span fg="white" bold={isSelected}>
            {file.newPath || file.oldPath}
          </span>
        </text>
      </box>

      {/* Stats */}
      <box flexDirection="row" gap={1}>
        {file.additions > 0 && (
          <text>
            <span fg="green">+{file.additions}</span>
          </text>
        )}
        {file.deletions > 0 && (
          <text>
            <span fg="red">-{file.deletions}</span>
          </text>
        )}
      </box>
    </box>
  );
}

interface HunkHeaderProps {
  hunk: DiffHunk;
}

/**
 * Hunk header (e.g., @@ -1,5 +1,7 @@).
 */
function HunkHeader({ hunk }: HunkHeaderProps) {
  return (
    <box paddingLeft={1}>
      <text>
        <span fg="cyan">{hunk.header}</span>
      </text>
    </box>
  );
}

interface UnifiedLineProps {
  line: DiffLine;
  lineNumberWidth: number;
  showLineNumbers: boolean;
}

/**
 * A single line in unified view.
 */
function UnifiedLine({
  line,
  lineNumberWidth,
  showLineNumbers,
}: UnifiedLineProps) {
  const color = LINE_COLORS[line.type];
  const prefix = LINE_PREFIXES[line.type];

  return (
    <box flexDirection="row">
      {showLineNumbers && (
        <text>
          <span fg="gray">
            {formatLineNumber(line.oldLineNumber, lineNumberWidth)}{" "}
            {formatLineNumber(line.newLineNumber, lineNumberWidth)} │
          </span>
        </text>
      )}
      <text>
        <span fg={color}>
          {prefix}
          {line.content}
        </span>
      </text>
    </box>
  );
}

interface SplitLineProps {
  oldLine: DiffLine | null;
  newLine: DiffLine | null;
  lineNumberWidth: number;
  halfWidth: number;
}

/**
 * A pair of lines in split view.
 */
function SplitLine({
  oldLine,
  newLine,
  lineNumberWidth,
  halfWidth,
}: SplitLineProps) {
  const contentWidth = halfWidth - lineNumberWidth - 3;

  const formatContent = (line: DiffLine | null, maxWidth: number): string => {
    if (!line) return " ".repeat(maxWidth);
    const content = line.content;
    if (content.length > maxWidth) {
      return content.slice(0, maxWidth - 1) + "…";
    }
    return content.padEnd(maxWidth);
  };

  return (
    <box flexDirection="row">
      {/* Old side */}
      <box flexDirection="row" width={halfWidth}>
        <text>
          <span fg="gray">
            {formatLineNumber(oldLine?.oldLineNumber ?? null, lineNumberWidth)} │
          </span>
          <span fg={oldLine ? LINE_COLORS[oldLine.type] : "gray"}>
            {formatContent(oldLine, contentWidth)}
          </span>
        </text>
      </box>

      {/* Separator */}
      <text>
        <span fg="gray">│</span>
      </text>

      {/* New side */}
      <box flexDirection="row" width={halfWidth}>
        <text>
          <span fg="gray">
            {formatLineNumber(newLine?.newLineNumber ?? null, lineNumberWidth)} │
          </span>
          <span fg={newLine ? LINE_COLORS[newLine.type] : "gray"}>
            {formatContent(newLine, contentWidth)}
          </span>
        </text>
      </box>
    </box>
  );
}

interface ModeToggleProps {
  mode: DiffViewMode;
  onModeChange: (mode: DiffViewMode) => void;
}

/**
 * Toggle between unified and split view.
 */
function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <box flexDirection="row" gap={2}>
      <text>
        <span fg="gray">View:</span>
      </text>
      <box flexDirection="row" gap={1}>
        <text>
          <span fg={mode === "unified" ? "cyan" : "gray"}>
            {mode === "unified" ? "●" : "○"} Unified
          </span>
        </text>
        <text>
          <span fg={mode === "split" ? "cyan" : "gray"}>
            {mode === "split" ? "●" : "○"} Split
          </span>
        </text>
      </box>
    </box>
  );
}

interface FileListProps {
  files: DiffFile[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Horizontal file list/tabs.
 */
function FileList({ files, selectedIndex, onSelect }: FileListProps) {
  return (
    <box flexDirection="row" gap={1} overflow="hidden">
      {files.map((file, index) => {
        const isSelected = index === selectedIndex;
        const statusColor = FILE_STATUS_COLORS[file.status];
        const fileName = (file.newPath || file.oldPath).split("/").pop() ?? "";

        return (
          <text key={index}>
            <span
              fg={isSelected ? "black" : statusColor}
              bg={isSelected ? "cyan" : undefined}
            >
              {` ${fileName} `}
            </span>
          </text>
        );
      })}
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DiffViewer Component
 *
 * Displays code diffs with support for:
 * - Unified view (traditional diff format)
 * - Split view (side-by-side comparison)
 * - File navigation
 * - Line numbers
 * - Syntax coloring (additions/deletions)
 *
 * @example
 * ```tsx
 * const files = parseDiff(gitDiffOutput);
 *
 * <DiffViewer
 *   files={files}
 *   mode="unified"
 *   showLineNumbers
 *   onFileSelect={(index) => setSelectedFile(index)}
 * />
 * ```
 */
export function DiffViewer({
  files,
  selectedFileIndex = 0,
  mode = "unified",
  showLineNumbers = true,
  contextLines = 3,
  collapseUnchanged = true,
  collapseThreshold = 5,
  onFileSelect,
  onModeChange,
  maxWidth = 120,
  maxHeight = 30,
}: DiffViewerProps) {
  const [internalMode, setInternalMode] = useState<DiffViewMode>(mode);
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(selectedFileIndex);

  // Use controlled or internal state
  const currentMode = mode;
  const currentFileIndex = selectedFileIndex;

  // Calculate line number width
  const lineNumberWidth = useMemo(
    () => calculateLineNumberWidth(files),
    [files]
  );

  // Get current file
  const currentFile = files[currentFileIndex];

  if (!currentFile) {
    return (
      <box flexDirection="column" padding={1}>
        <text>
          <span fg="gray">No diff to display</span>
        </text>
      </box>
    );
  }

  // Handlers
  const handleModeChange = (newMode: DiffViewMode) => {
    setInternalMode(newMode);
    onModeChange?.(newMode);
  };

  const handleFileSelect = (index: number) => {
    setInternalSelectedIndex(index);
    onFileSelect?.(index);
  };

  const handlePrevFile = () => {
    const newIndex = Math.max(0, currentFileIndex - 1);
    handleFileSelect(newIndex);
  };

  const handleNextFile = () => {
    const newIndex = Math.min(files.length - 1, currentFileIndex + 1);
    handleFileSelect(newIndex);
  };

  // Half width for split view
  const halfWidth = Math.floor((maxWidth - 3) / 2);

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      maxWidth={maxWidth}
      maxHeight={maxHeight}
    >
      {/* Header with mode toggle and file tabs */}
      <box flexDirection="column" gap={0}>
        {/* Mode toggle row */}
        <box
          flexDirection="row"
          justifyContent="space-between"
          paddingLeft={1}
          paddingRight={1}
          height={1}
        >
          <ModeToggle mode={currentMode} onModeChange={handleModeChange} />
          <box flexDirection="row" gap={1}>
            <text>
              <span fg="gray">
                File {currentFileIndex + 1} of {files.length}
              </span>
            </text>
          </box>
        </box>

        {/* File tabs */}
        {files.length > 1 && (
          <box paddingLeft={1} paddingRight={1}>
            <FileList
              files={files}
              selectedIndex={currentFileIndex}
              onSelect={handleFileSelect}
            />
          </box>
        )}
      </box>

      {/* Divider */}
      <box height={1} borderTop={1} borderColor="gray" />

      {/* File header */}
      <FileHeader file={currentFile} isSelected={false} />

      {/* Diff content */}
      <box
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        paddingBottom={1}
      >
        {currentFile.isBinary ? (
          <box padding={1}>
            <text>
              <span fg="yellow">Binary file - cannot display diff</span>
            </text>
          </box>
        ) : currentMode === "unified" ? (
          <UnifiedDiffContent
            file={currentFile}
            lineNumberWidth={lineNumberWidth}
            showLineNumbers={showLineNumbers}
          />
        ) : (
          <SplitDiffContent
            file={currentFile}
            lineNumberWidth={lineNumberWidth}
            halfWidth={halfWidth}
          />
        )}
      </box>

      {/* Footer with keyboard hints */}
      <box
        height={1}
        borderTop={1}
        borderColor="gray"
        flexDirection="row"
        justifyContent="center"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
      >
        <text>
          <span fg="gray">↑↓: Scroll</span>
        </text>
        {currentMode === "split" && (
          <text>
            <span fg="gray">←→: Scroll horizontal</span>
          </text>
        )}
        <text>
          <span fg="gray">n/p: Next/Prev file</span>
        </text>
        <text>
          <span fg="gray">u/s: Unified/Split view</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Content Renderers
// ============================================================================

interface UnifiedDiffContentProps {
  file: DiffFile;
  lineNumberWidth: number;
  showLineNumbers: boolean;
}

/**
 * Render unified diff content.
 */
function UnifiedDiffContent({
  file,
  lineNumberWidth,
  showLineNumbers,
}: UnifiedDiffContentProps) {
  return (
    <box flexDirection="column">
      {file.hunks.map((hunk, hunkIndex) => (
        <box key={hunkIndex} flexDirection="column">
          <HunkHeader hunk={hunk} />
          {hunk.lines.map((line, lineIndex) => (
            <UnifiedLine
              key={lineIndex}
              line={line}
              lineNumberWidth={lineNumberWidth}
              showLineNumbers={showLineNumbers}
            />
          ))}
        </box>
      ))}
    </box>
  );
}

interface SplitDiffContentProps {
  file: DiffFile;
  lineNumberWidth: number;
  halfWidth: number;
}

/**
 * Render split diff content.
 */
function SplitDiffContent({
  file,
  lineNumberWidth,
  halfWidth,
}: SplitDiffContentProps) {
  // Pair up lines for split view
  const pairedLines: { old: DiffLine | null; new: DiffLine | null }[] = [];

  for (const hunk of file.hunks) {
    let oldLines: DiffLine[] = [];
    let newLines: DiffLine[] = [];

    for (const line of hunk.lines) {
      if (line.type === "removed") {
        oldLines.push(line);
      } else if (line.type === "added") {
        newLines.push(line);
      } else {
        // Flush any pending paired lines
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
  }

  return (
    <box flexDirection="column">
      {/* Column headers */}
      <box flexDirection="row" height={1}>
        <box width={halfWidth}>
          <text>
            <span fg="red" bold>
              {" "}
              Before
            </span>
          </text>
        </box>
        <text>
          <span fg="gray">│</span>
        </text>
        <box width={halfWidth}>
          <text>
            <span fg="green" bold>
              {" "}
              After
            </span>
          </text>
        </box>
      </box>

      {/* Lines */}
      {pairedLines.map((pair, index) => (
        <SplitLine
          key={index}
          oldLine={pair.old}
          newLine={pair.new}
          lineNumberWidth={lineNumberWidth}
          halfWidth={halfWidth}
        />
      ))}
    </box>
  );
}

// ============================================================================
// Compact Diff Component
// ============================================================================

/**
 * Props for CompactDiff.
 */
export interface CompactDiffProps {
  /** Files with changes */
  files: DiffFile[];
  /** Maximum files to show */
  maxFiles?: number;
  /** Whether to show stats only (no content) */
  statsOnly?: boolean;
}

/**
 * Compact diff summary for embedding in lists.
 *
 * @example
 * ```tsx
 * <CompactDiff
 *   files={changedFiles}
 *   maxFiles={5}
 *   statsOnly
 * />
 * ```
 */
export function CompactDiff({
  files,
  maxFiles = 5,
  statsOnly = false,
}: CompactDiffProps) {
  const displayFiles = files.slice(0, maxFiles);
  const hiddenCount = files.length - maxFiles;

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <box flexDirection="column" gap={0}>
      {/* Summary */}
      <box flexDirection="row" gap={2}>
        <text>
          <span fg="white">{files.length} files changed</span>
        </text>
        <text>
          <span fg="green">+{totalAdditions}</span>
        </text>
        <text>
          <span fg="red">-{totalDeletions}</span>
        </text>
      </box>

      {/* File list */}
      {!statsOnly &&
        displayFiles.map((file, index) => (
          <box key={index} flexDirection="row" gap={1} paddingLeft={1}>
            <text>
              <span fg={FILE_STATUS_COLORS[file.status]}>
                {FILE_STATUS_LABELS[file.status]}
              </span>
            </text>
            <text>
              <span fg="white">{file.newPath || file.oldPath}</span>
            </text>
            <text>
              <span fg="green">+{file.additions}</span>
              <span fg="gray">/</span>
              <span fg="red">-{file.deletions}</span>
            </text>
          </box>
        ))}

      {/* Hidden files indicator */}
      {hiddenCount > 0 && (
        <box paddingLeft={1}>
          <text>
            <span fg="gray">+{hiddenCount} more files</span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default DiffViewer;
