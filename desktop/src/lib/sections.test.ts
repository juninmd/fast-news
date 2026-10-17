import { describe, expect, test } from "bun:test";
import { SECTION_LABEL, SECTION_SUBTITLE, sectionFromShortcut } from "./sections";
import { TAB_IDS } from "./tabs";

describe("sectionFromShortcut", () => {
  test("Alt+1..8 follows the sidebar order", () => {
    expect(sectionFromShortcut("1", true)).toBe("feed");
    expect(sectionFromShortcut("5", true)).toBe("stories");
    expect(sectionFromShortcut("8", true)).toBe("settings");
  });

  test("ignores the number without Alt, and keys outside the range", () => {
    expect(sectionFromShortcut("1", false)).toBeNull();
    expect(sectionFromShortcut("0", true)).toBeNull();
    expect(sectionFromShortcut("9", true)).toBeNull();
    expect(sectionFromShortcut("a", true)).toBeNull();
  });
});

describe("section catalogs", () => {
  test("every section has a label and a subtitle", () => {
    for (const id of TAB_IDS) {
      expect(SECTION_LABEL[id], id).toBeTruthy();
      expect(SECTION_SUBTITLE[id], id).toBeTruthy();
    }
  });
});
