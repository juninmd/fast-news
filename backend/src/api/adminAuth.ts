import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Guards endpoints that change data. With ADMIN_TOKEN set the request must
 * carry it (Bearer or x-admin-token); without it the endpoints stay closed in
 * production, so a missing secret never leaves writes open to the internet.
 */
export function requireAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const token = config.adminToken;
	if (!token) {
		if (config.nodeEnv === "production") {
			res.status(403).json({ error: "ADMIN_TOKEN is not configured" });
			return;
		}
		next();
		return;
	}
	const authorization = req.get("authorization") ?? "";
	const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
	const given = bearer ?? req.get("x-admin-token") ?? "";
	if (!safeEqual(given, token)) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}
	next();
}
