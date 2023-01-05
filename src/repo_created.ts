import type { Handler, HandlerResponse } from "@netlify/functions";

const enum HttpStatus {
	OK = 200
}

const handler: Handler = async (event, context): Promise<HandlerResponse> => {
	return { statusCode: HttpStatus.OK };
};

export { handler };
