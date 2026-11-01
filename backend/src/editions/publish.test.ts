import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
const sendPhoto = vi.fn();
const sendMediaGroup = vi.fn();
vi.mock("../services/telegram.js", () => ({
	getBot: () => ({ telegram: { sendMessage, sendPhoto, sendMediaGroup } }),
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
	sendPhoto.mockReset().mockResolvedValue({});
	sendMediaGroup.mockReset().mockResolvedValue([]);
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
		const chat = r.chats["-1001234567890"];
		expect(chat?.error).not.toContain("AAH-fake_token");
		expect(chat?.error).toContain("socket hang up");
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
			chats: {
				"-1001234567890": {
					status: "full",
					link: "https://t.me/c/1234567890/42",
				},
			},
		});
	});

	it("gives up after 3 straight failures and reports the chat as summary-only", async () => {
		fetchMock.mockRejectedValue(hangUp);
		const r = await runPublish(w, "s", "<html>");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const chat = r.chats["-1001234567890"];
		expect(chat?.status).toBe("summaryOnly");
		expect(chat?.link).toBeUndefined();
		expect(chat?.error).toContain("socket hang up");
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
		expect(r.chats["-1001234567890"]?.error).toContain("chat not found");
	});

	it("sends a verified Pages link button without attaching the HTML", async () => {
		const url = "https://juninmd.github.io/fast-news/edicoes/2026-09-18/manha/";
		const result = await publishEdition(w, "O Fio", "<html>", url);
		expect(sendMessage).toHaveBeenCalledWith(
			"-1001234567890",
			"O Fio",
			expect.objectContaining({
				reply_markup: {
					inline_keyboard: [[{ text: "Ler o jornal completo", url }]],
				},
			}),
		);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(result.chats["-1001234567890"]).toEqual({
			status: "full",
			link: url,
		});
	});

	it("rejects non-HTTPS Pages links before sending a Telegram message", async () => {
		const result = await publishEdition(
			w,
			"O Fio",
			"<html>",
			"javascript:alert(1)",
		);
		expect(sendMessage).not.toHaveBeenCalled();
		expect(result.chats["-1001234567890"]?.status).toBe("failed");
	});

	describe("photos", () => {
		const media = {
			cover: { url: "https://img.example.com/1.jpg", caption: "capa" },
			album: {
				urls: [
					"https://img.example.com/2.jpg",
					"https://img.example.com/3.jpg",
				],
				caption: "álbum",
				stories: [{ titulo: "x", texto: "", fontes: [1] }],
			},
		};
		const pages = "https://juninmd.github.io/fast-news/edicoes/x/";

		it("sends cover, album and then the text built from what was delivered", async () => {
			const summary = vi.fn().mockReturnValue("texto");
			await publishEdition(w, summary, "<html>", pages, media);
			expect(sendPhoto).toHaveBeenCalledWith(
				"-1001234567890",
				media.cover.url,
				{ caption: "capa", parse_mode: "HTML" },
			);
			const [, group] = sendMediaGroup.mock.calls[0] ?? [];
			expect(group).toHaveLength(2);
			expect(group[0]).toMatchObject({ caption: "álbum", parse_mode: "HTML" });
			expect(group[1]).not.toHaveProperty("caption");
			expect(summary).toHaveBeenCalledWith({
				cover: true,
				album: media.album.stories,
			});
			expect(sendMessage).toHaveBeenCalledWith(
				"-1001234567890",
				"texto",
				expect.anything(),
			);
		});

		it("keeps the story in the text when Telegram cannot fetch the image", async () => {
			sendPhoto.mockRejectedValue(new Error("wrong file identifier/HTTP URL"));
			sendMediaGroup.mockRejectedValue(
				new Error("failed to get HTTP URL content"),
			);
			const summary = vi.fn().mockReturnValue("texto completo");
			const r = await publishEdition(w, summary, "<html>", pages, media);
			expect(summary).toHaveBeenCalledWith({ cover: false, album: [] });
			expect(sendMessage).toHaveBeenCalledTimes(1);
			expect(r.chats["-1001234567890"]?.status).toBe("full");
		});

		it("sends a one-photo album as a plain photo", async () => {
			const one = {
				...media,
				cover: undefined,
				album: { ...media.album, urls: ["https://img.example.com/2.jpg"] },
			};
			await publishEdition(w, "t", "<html>", pages, one);
			expect(sendMediaGroup).not.toHaveBeenCalled();
			expect(sendPhoto).toHaveBeenCalledWith(
				"-1001234567890",
				"https://img.example.com/2.jpg",
				{ caption: "álbum", parse_mode: "HTML" },
			);
		});

		it("retries the text once after the photos went out, so a rerun never repeats them", async () => {
			sendMessage
				.mockRejectedValueOnce(new Error("boom"))
				.mockResolvedValue({});
			const r = await runPublish(w, "t", "<html>", pages, media);
			expect(sendMessage).toHaveBeenCalledTimes(2);
			expect(r.chats["-1001234567890"]?.status).toBe("full");
		});

		it("does not retry the text when no photo was sent", async () => {
			sendMessage.mockRejectedValue(new Error("boom"));
			const r = await runPublish(w, "t", "<html>", pages);
			expect(sendMessage).toHaveBeenCalledTimes(1);
			expect(r.chats["-1001234567890"]?.status).toBe("failed");
		});

		it("sends no photo when the edition has none", async () => {
			await publishEdition(w, "t", "<html>", pages);
			expect(sendPhoto).not.toHaveBeenCalled();
			expect(sendMediaGroup).not.toHaveBeenCalled();
		});
	});
});
