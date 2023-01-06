import { verify } from "@octokit/webhooks-methods";
import type { PingEvent, RepositoryEvent } from "@octokit/webhooks-types";

import type { Repository } from "./types";

export async function getRepoDetails(payload: string, signature: string, secret: string): Promise<Repository | null> {
	const valid = await verify(secret, payload, signature);
	if (!valid) {
		throw new Error("invalid payload");
	}
	const event: PingEvent | RepositoryEvent = JSON.parse(payload);
	if (!("action" in event) || event.action !== "created") {
		console.log(`Ignoring event: ${"action" in event ? event.action : "ping"}`);
		return null;
	}
	const {
		repository: { full_name: repoName, html_url: repoUrl },
		sender: { html_url: userUrl, login: userLogin, name: userName },
	} = event;
	return { repoName, repoUrl, userLogin, userName, userUrl };
}
