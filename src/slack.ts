import { type Button, type SectionBlock, WebClient } from "@slack/web-api";

import type { Repository } from "./types";
import { getConfig } from "./utils.js";

export async function notifyChannel(repo: Repository): Promise<void> {
	const channel = getConfig("SLACK_CHANNEL");
	const token = getConfig("SLACK_TOKEN");
	const client = new WebClient(token);
	const text = `A new repository ${repo.repoName} was just created by ${repo.userName ?? repo.userLogin}`;
	console.log(text);
	await client.chat.postMessage({
		blocks: [
			repoSection(repo),
		],
		channel,
		text,
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
