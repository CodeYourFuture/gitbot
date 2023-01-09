import { createHmac } from "node:crypto";

import { HandlerResponse } from "@netlify/functions";
import { rest, RestRequest } from "msw";

import { server } from "../../setupTests";

import { handler } from "./slack_interaction.js";

describe("slack interaction handler", () => {
	it("deletes the repository", async () => {
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		process.env.GITHUB_TOKEN = "GITHUB_TOKEN";
		let request: RestRequest | null = null;
		server.use(
			rest.delete("https://api.github.com/repos/:owner/:repo", (req, res, ctx) => {
				request = req;
				return res(ctx.status(204));
			}),
		);
		const { body, signature, timestamp } = createPayload(secret, {
			payload: JSON.stringify({
				type: "block_actions",
				actions: [{ action_id: "delete-repo", value: "owner/repo" }],
			}),
		});

		await expect(makeRequest(body, signature, timestamp)).resolves.toEqual({ statusCode: 200 });

		expect(request).not.toBeNull();
		expect(request!.headers.get("Authorization")).toBe("token GITHUB_TOKEN");
		expect(request!.params).toEqual({ owner: "owner", repo: "repo" });
	});

	const createPayload = (secret: string, payload: Record<string, string>): { body: string, signature: string, timestamp: number } => {
		const timestamp = Math.floor(Date.now() / 1_000);
		const body = new URLSearchParams(payload).toString();
		const hmac = createHmac("sha256", secret);
		hmac.update(`v0:${timestamp}:${body}`);
		const signature = hmac.digest("hex");
		return { body, signature, timestamp };
	};

	const makeRequest = (body: string, signature: string, timestamp: number): Promise<HandlerResponse> => {
		return handler({ body, headers: { "x-slack-request-timestamp": `${timestamp}`, "x-slack-signature": `v0=${signature}` } });
	};
});
