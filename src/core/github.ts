import { verify } from "@octokit/webhooks-methods";
import type { RepositoryCreatedEvent } from "@octokit/webhooks-types";

interface Repository {
	repoName: string;
	repoUrl: string;
	userName: string;
	userUrl: string;
}

export async function getRepoDetails(payload: string, signature: string, secret: string): Promise<Repository> {
	const valid = await verify(secret, payload, signature);
	if (!valid) {
		throw new Error("invalid payload");
	}
	const { repository: { name, owner, url } } : RepositoryCreatedEvent = JSON.parse(payload);
	return { repoName: name, repoUrl: url, userName: owner.login, userUrl: owner.url };
}
