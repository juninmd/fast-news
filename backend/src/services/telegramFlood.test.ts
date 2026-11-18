import { describe, expect, it, vi } from "vitest";
import { retryAfterSeconds, withFloodRetry } from "./telegramFlood.js";

const flood = (after: number) =>
	Object.assign(new Error("Too Many Requests"), {
		response: { error_code: 429, parameters: { retry_after: after } },
	});

describe("withFloodRetry", () => {
	it("waits retry_after and resends on 429", async () => {
		const callApi = vi
			.fn()
			.mockRejectedValueOnce(flood(3))
			.mockResolvedValueOnce({ message_id: 7 });
		const sleep = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const tg = withFloodRetry({ callApi }, { sleep });
		await expect(tg.callApi("sendMessage", { chat_id: 1 })).resolves.toEqual({
			message_id: 7,
		});
		expect(sleep).toHaveBeenCalledWith(3250);
		expect(callApi).toHaveBeenCalledTimes(2);
	});

	it("does not retry other errors", async () => {
		const callApi = vi.fn().mockRejectedValue(new Error("Bad Request"));
		const tg = withFloodRetry({ callApi }, { sleep: vi.fn() });
		await expect(tg.callApi("sendMessage", {})).rejects.toThrow("Bad Request");
		expect(callApi).toHaveBeenCalledTimes(1);
	});

	it("gives up after maxRetries or when the wait is too long", async () => {
		const callApi = vi.fn().mockRejectedValue(flood(1));
		const sleep = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const tg = withFloodRetry({ callApi }, { sleep, maxRetries: 2 });
		await expect(tg.callApi("sendMessage", {})).rejects.toThrow();
		expect(callApi).toHaveBeenCalledTimes(3);

		const slow = vi.fn().mockRejectedValue(flood(600));
		const tg2 = withFloodRetry({ callApi: slow }, { sleep });
		await expect(tg2.callApi("sendMessage", {})).rejects.toThrow();
		expect(slow).toHaveBeenCalledTimes(1);
	});

	it("reads retry_after only from 429s", () => {
		expect(retryAfterSeconds(flood(5))).toBe(5);
		expect(retryAfterSeconds({ response: { error_code: 400 } })).toBeNull();
	});
});
