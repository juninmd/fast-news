import { beforeEach, describe, expect, it, vi } from "vitest";

const cfg = vi.hoisted(() => ({ adminToken: "", nodeEnv: "development" }));
vi.mock("../config/env.js", () => ({ config: cfg }));

import { requireAdmin } from "./adminAuth.js";

function fakeReq(headers: Record<string, string>) {
	const lower = Object.fromEntries(
		Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
	);
	return { get: (name: string) => lower[name.toLowerCase()] } as never;
}

function fakeRes() {
	const res = { statusCode: 200, body: undefined as unknown };
	return {
		res: {
			status(code: number) {
				res.statusCode = code;
				return this;
			},
			json(body: unknown) {
				res.body = body;
				return this;
			},
		} as never,
		state: res,
	};
}

describe("requireAdmin", () => {
	beforeEach(() => {
		cfg.adminToken = "secret-token";
		cfg.nodeEnv = "development";
	});

	it("accepts a Bearer token", () => {
		const next = vi.fn();
		const { res } = fakeRes();
		requireAdmin(fakeReq({ authorization: "Bearer secret-token" }), res, next);
		expect(next).toHaveBeenCalledOnce();
	});

	it("accepts x-admin-token when Authorization uses a non-Bearer scheme", () => {
		const next = vi.fn();
		const { res } = fakeRes();
		requireAdmin(
			fakeReq({
				authorization: "Basic Zm9vOmJhcg==",
				"x-admin-token": "secret-token",
			}),
			res,
			next,
		);
		expect(next).toHaveBeenCalledOnce();
	});

	it("rejects a wrong Bearer token", () => {
		const next = vi.fn();
		const { res, state } = fakeRes();
		requireAdmin(fakeReq({ authorization: "Bearer nope" }), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(state.statusCode).toBe(401);
	});

	it("rejects a non-Bearer Authorization without x-admin-token", () => {
		const next = vi.fn();
		const { res, state } = fakeRes();
		requireAdmin(fakeReq({ authorization: "Basic Zm9vOmJhcg==" }), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(state.statusCode).toBe(401);
	});

	it("lets requests through without a token outside production", () => {
		cfg.adminToken = "";
		const next = vi.fn();
		const { res } = fakeRes();
		requireAdmin(fakeReq({}), res, next);
		expect(next).toHaveBeenCalledOnce();
	});

	it("blocks requests without a configured token in production", () => {
		cfg.adminToken = "";
		cfg.nodeEnv = "production";
		const next = vi.fn();
		const { res, state } = fakeRes();
		requireAdmin(fakeReq({}), res, next);
		expect(next).not.toHaveBeenCalled();
		expect(state.statusCode).toBe(403);
	});
});
