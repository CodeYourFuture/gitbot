import { type Button, type SectionBlock, WebClient } from "@slack/web-api";

import type { Repository } from "./types";

export async function notifyChannel(token: string, channel: string, repository: Repository): Promise<void> {
	const client = new WebClient(token);
	await client.chat.postMessage({
		blocks: [
			repoSection(repository),
		],
		channel,
		text: `A new repository was just created by ${repository.userName ?? repository.userLogin}`,
	});
}

const repoSection = ({ repoName, repoUrl, userLogin, userName, userUrl }: Repository): SectionBlock => ({
	type: "section",
	text: {
		type: "mrkdwn",
		text: `A new repository <${repoUrl}|\`${repoName}\`> was just created by <${userUrl}|${userName ? userName : `\`${userLogin}\``}>.`,
	},
	accessory: deleteButton(`${repoUrl}/settings#danger-zone`),
});

const deleteButton = (url: string): Button => ({
	type: "button",
	action_id: "delete-repo",
	style: "danger",
	text: {
		type: "plain_text",
		text: "Delete repo",
	},
	url,
});
