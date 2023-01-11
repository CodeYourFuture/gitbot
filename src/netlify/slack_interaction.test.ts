import { createHmac } from "node:crypto";

import { HandlerResponse } from "@netlify/functions";
import { rest, RestRequest } from "msw";

import { getBody, server } from "../../setupTests";

import { handler } from "./slack_interaction.js";

describe("slack interaction handler", () => {
	it("deletes the repository and updates the message", async () => {
		const secret = "secretsquirrel";
		process.env.GITHUB_TOKEN = "GITHUB_TOKEN";
		process.env.SLACK_CHANNEL = "SLACK_CHANNEL";
		process.env.SLACK_SIGNING_SECRET = secret;
		process.env.SLACK_TOKEN = "SLACK_TOKEN";
		let deleteRequest: RestRequest | null = null;
		let reactRequest: RestRequest | null = null;
		let updateRequest: RestRequest | null = null;
		server.use(
			rest.delete("https://api.github.com/repos/:owner/:repo", (req, res, ctx) => {
				deleteRequest = req;
				return res(ctx.status(204));
			}),
			rest.post("https://slack.com/api/chat.postMessage", (req, res, ctx) => {
				updateRequest = req;
				return res(ctx.json({ ok: true }));
			}),
			rest.post("https://slack.com/api/reactions.add", (req, res, ctx) => {
				reactRequest = req;
				return res(ctx.json({ ok: true }));
			}),
		);
		const { body, signature, timestamp } = createPayload(secret, {
			payload: JSON.stringify({
				actions: [{ action_id: "delete-repo", value: "owner/repo" }],
				message: { ts: "messageTimestamp" },
				type: "block_actions",
				user: { id: "slackUserId", username: "slackUserName" },
			}),
		});

		await expect(makeRequest(body, signature, timestamp)).resolves.toEqual({ statusCode: 200 });

		expect(deleteRequest).not.toBeNull();
		expect(deleteRequest!.headers.get("Authorization")).toBe("token GITHUB_TOKEN");
		expect(deleteRequest!.params).toEqual({ owner: "owner", repo: "repo" });

		expect(reactRequest).not.toBeNull();
		expect(reactRequest!.headers.get("Authorization")).toBe("Bearer SLACK_TOKEN");
		expect(getBody(await reactRequest!.text())).toEqual({
			channel: "SLACK_CHANNEL",
			name: "wastebasket",
			timestamp: "messageTimestamp",
		});

		expect(updateRequest).not.toBeNull();
		expect(updateRequest!.headers.get("Authorization")).toBe("Bearer SLACK_TOKEN");
		expect(getBody(await updateRequest!.text())).toEqual({
			blocks: [{
				text: { text: "Repository was deleted by <@slackUserId>.", type: "mrkdwn" },
				type: "section",
			}],
			channel: "SLACK_CHANNEL",
			text: "Repository owner/repo was deleted by slackUserName.",
			thread_ts: "messageTimestamp",
		});
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
