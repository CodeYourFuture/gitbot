import { createHmac } from "node:crypto";

import { validatePayload } from "./slack.js";
import type { Maybe, RepoRef } from "./types";

describe("validatePayload", () => {
	it("rejects invalid version", async () => {
		await expect(attemptValidation({
			signature: "v1=abc123",
		})).rejects.toThrow("invalid signature version");
	});

	it("rejects old timestamp", async () => {
		await expect(attemptValidation({
			signature: "v0=abc123",
			timestamp: Math.floor((Date.now() / 1_000) - (6 * 60)),
		})).rejects.toThrow("timestamp too old");
	});

	it("rejects invalid hash", async () => {
		const body = "goodbye=world";
		process.env.SLACK_SIGNING_SECRET = "keepitquiet";
		const { signature, timestamp } = sign(body, "someothersecret");
		await expect(attemptValidation({
			body,
			signature,
			timestamp,
		})).rejects.toThrow("payload validation failed");
	});

	it("turns the body into an object", async () => {
		const body = `hello=world&payload=${JSON.stringify({})}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		await expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).resolves.toBeUndefined();
	});

	it("extracts the relevant action", async () => {
		const body = `hello=world&payload=${JSON.stringify({ actions: [{ action_id: "delete-repo", value: "Foo/Bar" }] })}`;
		const secret = "secretsquirrel";
		process.env.SLACK_SIGNING_SECRET = secret;
		const { signature, timestamp } = sign(body, secret);
		await expect(attemptValidation({
			body,
			timestamp,
			signature,
		})).resolves.toEqual({ owner: "Foo", repo: "Bar" });
	});

	const attemptValidation = ({
		body = "",
		signature = "",
		timestamp = 0,
	}: { body?: string, signature?: string, timestamp?: number } = {}): Promise<Maybe<RepoRef>> => {
		return validatePayload(body, signature, timestamp);
	};
});

const sign = (payload: string, secret: string): { signature: string, timestamp: number } => {
	const timestamp = Math.floor(Date.now() / 1_000);
	const hmac = createHmac("sha256", secret);
	hmac.update(`v0:${timestamp}:${payload}`);
	return { signature: `v0=${hmac.digest("hex")}`, timestamp };
};
