import { getRepoDetails } from "./github.js";
import { notifyChannel } from "./slack.js";

export async function handleRepoCreation(payload: string | null, signature?: string): Promise<void> {
	if (!payload || !signature) {
		throw new Error("missing payload or signature");
	}
	const details = await getRepoDetails(payload, signature, getConfig("GITHUB_WEBHOOK_SECRET"));
	if (details) {
		console.log(`Repository ${details.repoName} created by ${details.userName ?? details.userLogin}`);
		await notifyChannel(getConfig("SLACK_TOKEN"), getConfig("SLACK_CHANNEL"), details);
	}
}

const getConfig = (name: string): string => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`missing configuration ${name}`);
	}
	return value;
};
