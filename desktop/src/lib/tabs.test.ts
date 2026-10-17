import { describe, expect, test } from "bun:test";
import { isTabId, panelId, TAB_IDS, tabId } from "./tabs";

describe("tabs", () => {
  test("recognises only known sections", () => {
    expect(isTabId("feed")).toBe(true);
    expect(isTabId("settings")).toBe(true);
    expect(isTabId("nope")).toBe(false);
  });

  test("panel and tab ids are unambiguous and unique", () => {
    expect(panelId("feed")).toBe("panel-feed");
    expect(tabId("feed")).toBe("aba-feed");
    expect(new Set(TAB_IDS.map(panelId)).size).toBe(TAB_IDS.length);
  });
});
