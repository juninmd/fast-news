import { describe, expect, test } from "bun:test";
import { isTabId, panelId, TAB_IDS, titleId } from "./tabs";

describe("tabs", () => {
  test("recognises only known sections", () => {
    expect(isTabId("feed")).toBe(true);
    expect(isTabId("settings")).toBe(true);
    expect(isTabId("nope")).toBe(false);
  });

  test("panel and title ids are unambiguous and unique", () => {
    expect(panelId("feed")).toBe("panel-feed");
    expect(titleId("feed")).toBe("titulo-feed");
    expect(new Set(TAB_IDS.map(panelId)).size).toBe(TAB_IDS.length);
    expect(new Set(TAB_IDS.map(titleId)).size).toBe(TAB_IDS.length);
  });
});
