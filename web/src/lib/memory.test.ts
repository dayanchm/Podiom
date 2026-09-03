import { describe, expect, it } from "vitest";

import { parseMemory } from "./memory";
import type { Dream } from "./types";

function dream(overrides: Partial<Dream>): Dream {
  return {
    ID: "dream-1",
    AgentName: "agent",
    RanAt: "2026-09-01T12:00:00.000Z",
    FinishedAt: "2026-09-01T12:01:00.000Z",
    Trigger: "manual",
    Status: "success",
    Error: "",
    SessionCount: 1,
    Kept: 0,
    Merged: 0,
    Pruned: 0,
    Note: "",
    NewItems: [],
    ...overrides,
  };
}

describe("parseMemory", () => {
  it("parses sections and dash or star bullets while ignoring the top-level title", () => {
    expect(
      parseMemory(`# Memory

## Preferences
- Likes focused plans
* Prefers terse updates

## Projects
- Ships Podiom
`),
    ).toEqual({
      intro: "",
      sections: [
        {
          title: "Preferences",
          items: [{ text: "Likes focused plans" }, { text: "Prefers terse updates" }],
        },
        {
          title: "Projects",
          items: [{ text: "Ships Podiom" }],
        },
      ],
    });
  });

  it("skips comments, strips inline bullet comments, collapses whitespace, and drops empty bullets", () => {
    expect(
      parseMemory(`<!-- generated -->
## Preferences
- Keeps    spacing   tight
- <!-- hidden -->
* Uses tabs\tand   spaces <!-- remove me -->
`),
    ).toEqual({
      intro: "",
      sections: [
        {
          title: "Preferences",
          items: [{ text: "Keeps spacing tight" }, { text: "Uses tabs and spaces" }],
        },
      ],
    });
  });

  it("keeps prose before the first section as intro and leaves pre-section bullets unattached", () => {
    expect(
      parseMemory(`Opening note
with wrapping.
- orphan bullet
## Preferences
- Attached item
`),
    ).toEqual({
      intro: "Opening note with wrapping.",
      sections: [
        {
          title: "Preferences",
          items: [{ text: "Attached item" }],
        },
      ],
    });
  });

  it("returns no sections for empty input or a title-only memory file", () => {
    expect(parseMemory("")).toEqual({ intro: "", sections: [] });
    expect(parseMemory("# Memory")).toEqual({ intro: "", sections: [] });
  });

  it("sets since from the oldest successful matching dream and marks items from the newest successful dream as new", () => {
    const oldest = dream({
      ID: "oldest",
      RanAt: "2026-09-01T12:00:00.000Z",
      NewItems: [{ section: "Preferences", text: "Likes focused plans" }],
    });
    const failed = dream({
      ID: "failed",
      RanAt: "2026-09-02T12:00:00.000Z",
      Status: "error",
      NewItems: [{ section: "Preferences", text: "Likes focused plans" }],
    });
    const newest = dream({
      ID: "newest",
      RanAt: "2026-09-03T12:00:00.000Z",
      NewItems: [{ section: "Projects", text: "Ships Podiom" }],
    });

    expect(
      parseMemory(
        `## Preferences
- Likes   focused   plans
## Projects
- Ships Podiom
`,
        [newest, failed, oldest],
      ),
    ).toEqual({
      intro: "",
      sections: [
        {
          title: "Preferences",
          items: [{ text: "Likes focused plans", since: oldest.RanAt }],
        },
        {
          title: "Projects",
          items: [{ text: "Ships Podiom", since: newest.RanAt, isNew: true }],
        },
      ],
    });
  });
});
