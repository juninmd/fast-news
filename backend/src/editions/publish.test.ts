import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
const sendDocument = vi.fn();
vi.mock("../services/telegram.js", () => ({
	getBot: () => ({ telegram: { sendMessage, sendDocument } }),
}));
vi.mock("../config/env.js", () => ({
	config: {
		telegramEnabled: true,
		telegramBotToken: "123:secret",
		telegramChatIds: ["-100"],
	},
}));

const { publishEdition } = await import("./publish.js");

const w = {
	kind: "manha" as const,
	start: new Date(0),
	end: new Date(0),
	day: "2026-09-18",
};
const hangUp = new Error(
	"request to https://api.telegram.org/bot8506573458:AAH-fake_token/sendDocument failed, reason: socket hang up",
);

beforeEach(() => {
	sendMessage.mockReset().mockResolvedValue({});
	sendDocument.mockReset();
});

describe("publishEdition", () => {
	it("never lets the bot token reach logs through an error message", async () => {
		sendDocument.mockRejectedValue(hangUp);
		const r = await publishEdition(w, "s", "<html>");
		expect(r.failed[0]?.error).not.toContain("AAH-fake_token");
		expect(r.failed[0]?.error).toContain("socket hang up");
	});

	it("retries the file once so a dropped connection still delivers it", async () => {
		sendDocument.mockRejectedValueOnce(hangUp).mockResolvedValueOnce({});
		const r = await publishEdition(w, "s", "<html>");
		expect(sendDocument).toHaveBeenCalledTimes(2);
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(r).toEqual({ delivered: ["-100"], failed: [] });
	});
});
