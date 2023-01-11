import { Octokit } from "@octokit/rest";
import { verify } from "@octokit/webhooks-methods";
import type { PingEvent, RepositoryCreatedEvent, RepositoryEvent } from "@octokit/webhooks-types";

import type { Maybe, MessageRef, Repository } from "./types";
import { getConfig } from "./utils.js";

export const SIGNATURE_HEADER = "x-hub-signature-256";

export const deleteRepo = async ({ repo: { repoName } }: MessageRef): Promise<void> => {
	const [owner, repo] = repoName.split("/");
	const client = new Octokit({ auth: getConfig("GITHUB_TOKEN") });
	await client.rest.repos.delete({ owner, repo });
};

export const validatePayload = async (body: string, signature: string): Promise<Maybe<Repository>> => {
	const secret = getConfig("GITHUB_WEBHOOK_SECRET");
	if (!(await verify(secret, body, signature))) {
		throw new Error("payload validation failed");
	}
	const payload: PingEvent | RepositoryEvent = JSON.parse(body);
	if (!("action" in payload) || payload.action !== "created") {
		console.log(`Ignoring event: ${"action" in payload ? payload.action : "ping"}`);
		return;
	}
	return createRepo(payload);
};

const createRepo = (payload: RepositoryCreatedEvent): Repository => ({
	repoName: payload.repository.full_name,
	repoUrl: payload.repository.html_url,
	userLogin: payload.sender.login,
	userName: payload.sender.name,
	userUrl: payload.sender.html_url,
});
