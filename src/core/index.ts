import { getRepoDetails } from "./github.js";

export async function handleRepoCreation(payload: string | null, signature?: string): Promise<void> {
	const secret = getConfig("GITHUB_WEBHOOK_SECRET");
	if (payload === null || signature === undefined) {
		throw new Error("missing payload or signature");
	}
	const details = await getRepoDetails(payload, signature, secret);
	console.log(`Repository ${details.repoName} created by ${details.userName}`);
}

const getConfig = (name: string): string => {
	const value = process.env[name];
	if (value === undefined) {
		throw new Error(`missing configuration ${name}`);
	}
	return value;
};
