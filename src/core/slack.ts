import { WebClient } from "@slack/web-api";

import type { Repository } from "./types";

export async function notifyChannel(token: string, channel: string, repo: Repository): Promise<void> {
	const client = new WebClient(token);
	await client.chat.postMessage({
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `A new repository \`${repo.repoName}\` was just created by \`${repo.userName}\`.`,
				},
				accessory: {
					action_id: "delete-repo",
					type: "button",
					text: {
						type: "plain_text",
						text: "🗑️Delete Repo",
						emoji: true,
					},
					style: "danger",
					url: `${repo.repoUrl}/settings#danger-zone`,
				},
			},
		],
		channel,
	});
}
