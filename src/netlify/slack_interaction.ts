import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

import { deleteRepo } from "../github.js";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, updateMessage, validatePayload } from "../slack.js";
import type { Maybe, MessageRef } from "../types.js";

type Event = Pick<HandlerEvent, "body" | "headers">;

const handler = (async (event: Event): Promise<HandlerResponse> => {
	let payload: Maybe<MessageRef>;
	try {
		payload = validatePayload(getBody(event), getSignature(event), getTimestamp(event));
	} catch (err) {
		console.error(err);
		return { statusCode: 400 };
	}
	if (payload) {
		try {
			if (payload.action === "delete") {
				await deleteRepo(payload);
			}
			await updateMessage(payload);
		} catch (err) {
			console.error(err);
		}
	}
	return { statusCode: 200 };
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

const getTimestamp = ({ headers }: Event): number => {
	const header = headers[TIMESTAMP_HEADER];
	if (header === undefined) {
		throw new Error("missing timestamp header");
	}
	const timestamp = Number(header);
	if (Number.isNaN(timestamp)) {
		throw new Error("invalid timestamp header");
	}
	return timestamp;
};

export { handler };
