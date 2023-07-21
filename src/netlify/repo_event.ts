import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

import { SIGNATURE_HEADER, validatePayload } from "../github.js";
import { notifyChannel } from "../slack.js";
import type { Maybe, Repository } from "../types.js";

const enum HttpStatus {
	OK = 200,
	BAD_REQUEST = 400,
}

type Event = Pick<HandlerEvent, "body" | "headers">

const handler = (async (event: Event): Promise<HandlerResponse> => {
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
}) satisfies Handler;

const getBody = ({ body }: Event): string => {
	if (body === null) {
		throw new Error("missing request body");
	}
	return body;
};

const getSignature = ({ headers }: Event): string => {
	const signature = headers[SIGNATURE_HEADER];
	if (signature === undefined) {
		throw new Error("missing signature header");
	}
	return signature;
};

export { handler };
