import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
vi.mock("../services/telegram.js", () => ({
	getBot: () => ({ telegram: { sendMessage } }),
}));
vi.mock("../config/env.js", () => ({
	config: {
		telegramEnabled: true,
		telegramBotToken: "8506573458:AAH-fake_token",
		telegramChatIds: ["-1001234567890"],
	},
}));

const { publishEdition } = await import("./publish.js");

const w = {
	kind: "manha" as const,
	start: new Date(0),
	end: new Date(0),
	day: "2026-09-18",
};

const fetchMock = vi.fn();

function okResponse(messageId: number) {
	return {
		ok: true,
		status: 200,
		statusText: "OK",
		json: async () => ({ ok: true, result: { message_id: messageId } }),
	};
}

// Real undici fetch failures can carry the request URL (bot token included)
// in the error message, same class of leak as Telegraf's own errors.
const hangUp = new Error(
	"fetch failed: request to https://api.telegram.org/bot8506573458:AAH-fake_token/sendDocument, reason: socket hang up",
);

beforeEach(() => {
	sendMessage.mockReset().mockResolvedValue({});
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
	vi.useFakeTimers();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

/** Runs publishEdition while flushing the retry-delay timers it schedules. */
async function runPublish(...args: Parameters<typeof publishEdition>) {
	const promise = publishEdition(...args);
	await vi.runAllTimersAsync();
	return promise;
}

describe("publishEdition", () => {
	it("never lets the bot token reach logs through an error message", async () => {
		fetchMock.mockRejectedValue(hangUp);
		const r = await runPublish(w, "s", "<html>");
		expect(r.failed[0]?.error).not.toContain("AAH-fake_token");
		expect(r.failed[0]?.error).toContain("socket hang up");
	});

	it("retries the file up to 3 times so a couple of dropped connections still deliver it", async () => {
		fetchMock
			.mockRejectedValueOnce(hangUp)
			.mockRejectedValueOnce(hangUp)
			.mockResolvedValueOnce(okResponse(42));
		const r = await runPublish(w, "s", "<html>");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(r).toEqual({
			delivered: ["-1001234567890"],
			failed: [],
			links: { "-1001234567890": "https://t.me/c/1234567890/42" },
		});
	});

	it("gives up after 3 straight failures and reports the chat as failed", async () => {
		fetchMock.mockRejectedValue(hangUp);
		const r = await runPublish(w, "s", "<html>");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(r.delivered).toEqual(["-1001234567890"]);
		expect(r.links).toEqual({});
		expect(r.failed[0]?.error).toContain("socket hang up");
	});

	it("treats a Telegram-side error response as a failure without retrying forever", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 400,
			statusText: "Bad Request",
			json: async () => ({ ok: false, description: "chat not found" }),
		});
		const r = await runPublish(w, "s", "<html>");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(r.failed[0]?.error).toContain("chat not found");
	});
});
