import { createHmac } from "node:crypto";

import { validatePayload } from "./slack.js";
import type { Maybe, RepoRef } from "./types";

describe("validatePayload", () => {
	it("rejects invalid version", async () => {
		expect(() => attemptValidation({
			signature: "v1=abc123",
		})).toThrow("invalid signature version");
	});

	it("rejects old timestamp", async () => {
		expect(() => attemptValidation({
			signature: "v0=abc123",
			timestamp: Math.floor((Date.now() / 1_000) - (6 * 60)),
		})).toThrow("timestamp too old");
	});

	it("rejects invalid hash", async () => {
		const body = "goodbye=world";
		process.env.SLACK_SIGNING_SECRET = "keepitquiet";
		const { signature, timestamp } = sign(body, "someothersecret");
		expect(() => attemptValidation({
			body,
			signature,
			timestamp,
		})).toThrow("payload validation failed");
	});

	it("turns the body into an object", async () => {
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

	it("extracts the relevant action", async () => {
		const payload = {
			actions: [{ action_id: "delete-repo", value: "Foo/Bar" }],
			message: { ts: "123.456" },
			user: { id: "userId", username: "userName" },
		};
		const body = `hello=world&payload=${JSON.stringify(payload)}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).toEqual({ messageTs: "123.456", owner: "Foo", repo: "Bar", userId: "userId", userName: "userName" });
	});

	const attemptValidation = ({
		body = "",
		signature = "",
		timestamp = 0,
	}: { body?: string, signature?: string, timestamp?: number } = {}): Maybe<RepoRef> => {
		return validatePayload(body, signature, timestamp);
	};
});

const sign = (payload: string, secret: string): { signature: string, timestamp: number } => {
	const timestamp = Math.floor(Date.now() / 1_000);
	const hmac = createHmac("sha256", secret);
	hmac.update(`v0:${timestamp}:${payload}`);
	return { signature: `v0=${hmac.digest("hex")}`, timestamp };
};
