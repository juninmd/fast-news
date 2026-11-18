/**
 * Telegram answers 429 with `parameters.retry_after` (seconds) when a bot sends
 * faster than ~1 msg/s per chat or 20/min per group. Without honouring it the
 * message is simply lost. Every Telegraf method goes through `callApi`, so
 * wrapping it once covers sendMessage, sendPhoto, sendMediaGroup, etc.
 */
type CallApi = (...args: any[]) => Promise<any>;

export interface FloodRetryOptions {
	maxRetries?: number;
	/** Longer waits are not worth blocking a job for: give up and surface the 429. */
	maxWaitSeconds?: number;
	sleep?: (ms: number) => Promise<void>;
}

export function retryAfterSeconds(err: unknown): number | null {
	const e = err as {
		code?: number;
		response?: { error_code?: number; parameters?: { retry_after?: number } };
	};
	const code = e?.response?.error_code ?? e?.code;
	if (code !== 429) return null;
	const after = e?.response?.parameters?.retry_after;
	return typeof after === "number" && after >= 0 ? after : 1;
}

export function withFloodRetry<T extends { callApi: CallApi }>(
	telegram: T,
	opts: FloodRetryOptions = {},
): T {
	const maxRetries = opts.maxRetries ?? 3;
	const maxWait = opts.maxWaitSeconds ?? 60;
	const sleep =
		opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
	const original = telegram.callApi.bind(telegram);
	telegram.callApi = async (...args: unknown[]) => {
		for (let attempt = 0; ; attempt++) {
			try {
				return await original(...args);
			} catch (err) {
				const wait = retryAfterSeconds(err);
				if (wait === null || attempt >= maxRetries || wait > maxWait) throw err;
				console.warn(
					`[Telegram] 429 on ${String(args[0])}, retrying in ${wait}s (${attempt + 1}/${maxRetries})`,
				);
				await sleep(wait * 1000 + 250);
			}
		}
	};
	return telegram;
}
