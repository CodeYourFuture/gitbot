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
		onUnhandledRequest: ({ method, url }) => {
			throw new Error(`Unhandled ${method} request to ${url}`);
		},
	});
});

beforeEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
