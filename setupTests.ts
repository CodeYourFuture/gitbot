import { setupServer } from "msw/node";

export const server = setupServer();

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
