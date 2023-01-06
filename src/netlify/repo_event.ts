import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

import { SIGNATURE_HEADER, validatePayload } from "../github.js";
import { notifyChannel } from "../slack.js";
import type { Maybe, Repository } from "../types";

const enum HttpStatus {
	OK = 200,
	BAD_REQUEST = 400,
}

const handler: Handler = async (event): Promise<HandlerResponse> => {
	let payload: Maybe<Repository>;
	try {
		payload = await validatePayload(getBody(event), getSignature(event));
	} catch (err) {
		console.error(err);
		return { statusCode: HttpStatus.BAD_REQUEST };
	}
	if (payload) {
		try {
			await notifyChannel(payload);
		} catch (err) {
			console.error(err);
		}
	}
	return { statusCode: HttpStatus.OK };
};

const getBody = ({ body }: Pick<HandlerEvent, "body">): string => {
	if (body === null) {
		throw new Error("missing request body");
	}
	return body;
};

const getSignature = ({ headers }: Pick<HandlerEvent, "headers">): string => {
	const signature = headers[SIGNATURE_HEADER];
	if (signature === undefined) {
		throw new Error("missing signature header");
	}
	return signature;
};

export { handler };
