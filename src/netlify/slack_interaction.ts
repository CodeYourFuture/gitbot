import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";

import { SIGNATURE_HEADER, TIMESTAMP_HEADER, validatePayload } from "../slack.js";

type Event = Pick<HandlerEvent, "body" | "headers">;

const handler = async (event: Event): Promise<HandlerResponse> => {
	try {
		await validatePayload(getBody(event), getSignature(event), getTimestamp(event));
	} catch (err) {
		console.error(err);
		return { statusCode: 400 };
	}
	return { statusCode: 200 };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const typecheck = handler satisfies Handler;

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
