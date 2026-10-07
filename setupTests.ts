import type { HttpNetworkFrame } from "msw/experimental";
import { setupServer } from "msw/node";

export const server = setupServer();

export const getBody = (body: string): unknown => {
	const payload = Object.fromEntries(new URLSearchParams(body).entries());
	if ("blocks" in payload) {
		return { ...payload, blocks: JSON.parse(payload.blocks) };
	}
	return payload;
};

beforeAll(() => {
	server.listen({
		onUnhandledFrame({ defaults, frame }) {
			if (frame.protocol === "http") {
				const { data: { request: { method, url } } } = frame as HttpNetworkFrame;
				throw new Error(`Unhandled ${method} request to ${url}`);
			}
			defaults.warn();
		},
	});
});

beforeEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
