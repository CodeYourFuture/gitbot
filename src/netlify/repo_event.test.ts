import { type HandlerResponse } from "@netlify/functions";
import { sign } from "@octokit/webhooks-methods";
import type { PingEvent, RepositoryEvent } from "@octokit/webhooks-types";
import { rest, RestRequest } from "msw";

import { server } from "../../setupTests.js";

import { handler } from "./repo_event.js";

describe("repo event handler", () => {
	it("notifies the specified Slack channel", async () => {
		let request: RestRequest | null = null;
		const secret = "under-your-hat";
		process.env.GITHUB_WEBHOOK_SECRET = secret;
		process.env.SLACK_CHANNEL = "SLACK_CHANNEL";
		process.env.SLACK_TOKEN = "SLACK_TOKEN";
		server.use(
			rest.post("https://slack.com/api/chat.postMessage", (req, res, ctx) => {
				request = req;
				return res(ctx.json({ ok: true }));
			}),
		);
		const { body, signature } = await createPayload(secret, {
			action: "created",
			repository: { full_name: "Foo/Bar", html_url: "https://github.com/Foo/Bar" },
			sender: { html_url: "https://github.com/octocat", login: "octocat", name: "Monalisa Octocat" },
		} as RepositoryEvent);

		const response = await makeRequest(body, signature);

		expect(response).toEqual({ statusCode: 200 });
		expect(request).not.toBeNull();
		expect(request!.headers.get("Authorization")).toBe("Bearer SLACK_TOKEN");
		const payload = Object.fromEntries(new URLSearchParams(await request!.text()).entries());
		expect(payload).toMatchObject({
			channel: "SLACK_CHANNEL",
			text: "A new repository Foo/Bar was just created by Monalisa Octocat",
		});
		expect(JSON.parse(payload.blocks)).toEqual([{
			accessory: {
				action_id: "delete-repo",
				style: "danger",
				text: {
					text: "Delete repo",
					type: "plain_text",
				},
				type: "button",
				url: "https://github.com/Foo/Bar/settings#danger-zone",
			},
			text: {
				"text": "A new repository <https://github.com/Foo/Bar|`Foo/Bar`> was just created by <https://github.com/octocat|Monalisa Octocat>.",
				"type": "mrkdwn",
			},
			type: "section",
		}]);
	});

	it("uses the login as a fallback", async () => {
		let request: RestRequest | null = null;
		const secret = "shhh";
		process.env.GITHUB_WEBHOOK_SECRET = secret;
		server.use(
			rest.post("https://slack.com/api/chat.postMessage", (req, res, ctx) => {
				request = req;
				return res(ctx.json({ ok: true }));
			}),
		);
		const { body, signature } = await createPayload(secret, {
			action: "created",
			repository: { full_name: "Foo/Bar", html_url: "https://github.com/Foo/Bar" },
			sender: { html_url: "https://github.com/octocat", login: "octocat" },
		} as RepositoryEvent);

		await expect(makeRequest(body, signature)).resolves.toEqual({ statusCode: 200 });

		const payload = Object.fromEntries(new URLSearchParams(await request!.text()).entries());
		expect(payload).toHaveProperty("text", "A new repository Foo/Bar was just created by octocat");
		expect(JSON.parse(payload.blocks))
			.toHaveProperty("0.text.text", expect.stringContaining("<https://github.com/octocat|`octocat`>"));
	});

	it("ignores ping events", async () => {
		const secret = "shhh";
		process.env.GITHUB_WEBHOOK_SECRET = secret;
		const { body, signature } = await createPayload(secret, {} as PingEvent);
		await expect(makeRequest(body, signature)).resolves.toEqual({ statusCode: 200 });
	});

	it("ignores other repository events", async () => {
		const secret = "shhh";
		process.env.GITHUB_WEBHOOK_SECRET = secret;
		const { body, signature } = await createPayload(secret, { action: "archived" } as RepositoryEvent);
		await expect(makeRequest(body, signature)).resolves.toEqual({ statusCode: 200 });
	});

	describe("error states", () => {
		beforeEach(() => {
			console.error = jest.fn();
		});

		it("rejects invalid payloads", async () => {
			process.env.GITHUB_WEBHOOK_SECRET = "shhh";
			const { body, signature } = await createPayload("wrong", {} as PingEvent);
			await expect(makeRequest(body, signature)).resolves.toEqual({ statusCode: 400 });
		});

		it("rejects missing headers", async () => {
			console.error = jest.fn();
			await expect(handler({ body: "", headers: {} })).resolves.toEqual({ statusCode: 400 });
		});

		it("rejects missing body", async () => {
			await expect(handler({ body: null, headers: {} })).resolves.toEqual({ statusCode: 400 });
		});
	});

	const createPayload = async (secret: string, event: PingEvent | RepositoryEvent): Promise<{ body: string, signature: string }> => {
		const body = JSON.stringify(event);
		const signature = await sign({ algorithm: "sha256", secret }, body);
		return { body, signature };
	};

	const makeRequest = (body: string, signature: string): Promise<HandlerResponse> => {
		return handler({ body, headers: { "x-hub-signature-256": signature } });
	};
});
