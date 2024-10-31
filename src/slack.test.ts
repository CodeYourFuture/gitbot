import { createHmac } from "node:crypto";

import { validatePayload } from "./slack.js";
import type { Maybe, MessageRef } from "./types.js";

describe("validatePayload", () => {
	it("rejects invalid version", () => {
		expect(() => attemptValidation({
			signature: "v1=abc123",
		})).toThrow("invalid signature version");
	});

	it("rejects old timestamp", () => {
		expect(() => attemptValidation({
			signature: "v0=abc123",
			timestamp: Math.floor((Date.now() / 1_000) - (6 * 60)),
		})).toThrow("timestamp too old");
	});

	it("rejects invalid hash", () => {
		const body = "goodbye=world";
		process.env.SLACK_SIGNING_SECRET = "keepitquiet";
		const { signature, timestamp } = sign(body, "someothersecret");
		expect(() => attemptValidation({
			body,
			signature,
			timestamp,
		})).toThrow("payload validation failed");
	});

	it("turns the body into an object", () => {
		const body = `hello=world&payload=${JSON.stringify({})}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).toBeUndefined();
	});

	it("extracts the relevant delete action", () => {
		const payload = {
			actions: [{
				action_id: "delete-repository",
				value: JSON.stringify({ repoName: "repoName", repoUrl: "repoUrl", userName: "userName", userUrl: "userUrl" }),
			}],
			message: { ts: "123.456" },
			user: { id: "userId", username: "slackUserName" },
		};
		const body = `hello=world&payload=${JSON.stringify(payload)}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).toEqual({
			action: "delete",
			messageTs: "123.456",
			repo: {
				repoName: "repoName",
				repoUrl: "repoUrl",
				userName: "userName",
				userUrl: "userUrl",
			},
			userId: "userId",
			userName: "slackUserName",
		});
	});

	it("extracts the relevant dismiss action", () => {
		const payload = {
			actions: [{
				action_id: "dismiss-deletion",
				value: JSON.stringify({ repoName: "repoName", repoUrl: "repoUrl", userName: "userName", userUrl: "userUrl" }),
			}],
			message: { ts: "123.456" },
			user: { id: "userId", username: "slackUserName" },
		};
		const body = `hello=world&payload=${JSON.stringify(payload)}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).toEqual({
			action: "dismiss",
			messageTs: "123.456",
			repo: {
				repoName: "repoName",
				repoUrl: "repoUrl",
				userName: "userName",
				userUrl: "userUrl",
			},
			userId: "userId",
			userName: "slackUserName",
		});
	});

	const attemptValidation = ({
		body = "",
		signature = "",
		timestamp = 0,
	}: { body?: string, signature?: string, timestamp?: number } = {}): Maybe<MessageRef> => {
		return validatePayload(body, signature, timestamp);
	};
});

const sign = (payload: string, secret: string): { signature: string, timestamp: number } => {
	const timestamp = Math.floor(Date.now() / 1_000);
	const hmac = createHmac("sha256", secret);
	hmac.update(`v0:${timestamp.toFixed(0)}:${payload}`);
	return { signature: `v0=${hmac.digest("hex")}`, timestamp };
};
