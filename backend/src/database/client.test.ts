import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: { databaseUrl: "postgres://x" },
}));

const handlers: Record<string, (arg: unknown) => void> = {};
vi.mock("pg", () => {
	class Pool {
		on(event: string, fn: (arg: unknown) => void) {
			handlers[event] = fn;
		}
		end() {
			return Promise.resolve();
		}
	}
	return { default: { Pool } };
});

const { getPool, closePool, VECTOR_SESSION_SQL } = await import("./client.js");

describe("pool vector session settings", () => {
	afterEach(() => closePool());

	it("applies probes + iterative scan on every new connection", async () => {
		getPool();
		const query = vi.fn().mockResolvedValue({});
		handlers.connect({ query });
		expect(query).toHaveBeenCalledWith(VECTOR_SESSION_SQL);
		expect(VECTOR_SESSION_SQL).toContain("ivfflat.probes = 10");
		expect(VECTOR_SESSION_SQL).toContain("ivfflat.iterative_scan");
	});

	it("does not break the connection when pgvector rejects a setting", async () => {
		getPool();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const query = vi
			.fn()
			.mockRejectedValue(new Error("unrecognized parameter"));
		handlers.connect({ query });
		await new Promise((r) => setTimeout(r, 0));
		expect(warn).toHaveBeenCalled();
	});
});
