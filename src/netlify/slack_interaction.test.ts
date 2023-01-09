import { createHmac } from "node:crypto";

import { HandlerResponse } from "@netlify/functions";

import { handler } from "./slack_interaction.js";

describe("slack interaction handler", () => {
	it("logs the interaction", async () => {
		console.log = jest.fn();
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		process.env.GITHUB_TOKEN = "GITHUB_TOKEN";
		const { body, signature, timestamp } = createPayload(secret, {
			payload: JSON.stringify({
				type: "block_actions",
				actions: [{ action_id: "delete-repo", value: "owner/repo" }],
			}),
		});

		await expect(makeRequest(body, signature, timestamp)).resolves.toEqual({ statusCode: 200 });

		expect(console.log).toHaveBeenCalledWith("Received action delete-repo with value owner/repo");
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
