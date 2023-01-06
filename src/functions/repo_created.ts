import type { Handler, HandlerResponse } from "@netlify/functions";

import { handleRepoCreation } from "../core/index.js";

const enum HttpStatus {
	OK = 200
}

const handler: Handler = async (event): Promise<HandlerResponse> => {
	try {
		await handleRepoCreation(event.body ?? undefined, event.headers["x-hub-signature-256"]);
	} catch (err) {
		console.error(err);
	}
	return { statusCode: HttpStatus.OK };
};

export { handler };
