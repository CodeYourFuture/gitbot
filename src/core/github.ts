import { verify } from "@octokit/webhooks-methods";
import type { PingEvent, RepositoryCreatedEvent } from "@octokit/webhooks-types";

import type { Repository } from "./types";

export async function getRepoDetails(payload: string, signature: string, secret: string): Promise<Repository | null> {
	const valid = await verify(secret, payload, signature);
	if (!valid) {
		throw new Error("invalid payload");
	}
	const event: PingEvent | RepositoryCreatedEvent = JSON.parse(payload);
	if (!("action" in event) || event.action !== "created") {
		console.log(`Ignoring event: ${"action" in event ? event.action : "ping"}`);
		return null;
	}
	const {
		repository: { html_url: repoUrl, name: repoName },
		sender: { html_url: userUrl, login: userName },
	} = event;
	return { repoName, repoUrl, userName, userUrl };
}
