import { verify } from "@octokit/webhooks-methods";
import type { RepositoryCreatedEvent } from "@octokit/webhooks-types";

interface Repository {
	repoName: string;
	repoUrl: string;
	userName: string;
	userUrl: string;
}

export async function getRepoDetails(payload: string, signature: string, secret: string): Promise<Repository | null> {
	const valid = await verify(secret, payload, signature);
	if (!valid) {
		throw new Error("invalid payload");
	}
	const { action, repository: { name, owner, url } } : RepositoryCreatedEvent = JSON.parse(payload);
	if (action !== "created") {
		return null;
	}
	return { repoName: name, repoUrl: url, userName: owner.login, userUrl: owner.url };
}
