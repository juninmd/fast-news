import type { NextFunction, Request, Response, Router } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;
interface RouteLayer {
	handle: Handler;
}

/**
 * Express 4 ignores rejected promises from async handlers, so a failed query
 * left the request hanging until the client gave up. Wrapping every route
 * handler sends the rejection to the app's error middleware instead.
 */
export function forwardAsyncErrors(router: Router): Router {
	const layers = router.stack as unknown as Array<{
		route?: { stack: RouteLayer[] };
	}>;
	for (const layer of layers) {
		for (const entry of layer.route?.stack ?? []) {
			const handler = entry.handle;
			if (handler.length >= 4) continue;
			entry.handle = (req, res, next) => {
				try {
					const result = handler(req, res, next);
					if (result instanceof Promise) result.catch(next);
				} catch (err) {
					next(err);
				}
			};
		}
	}
	return router;
}
