import { WebClient } from "@slack/web-api";

import type { Repository } from "./types";

export async function notifyChannel(
	token: string,
	channel: string,
	{ repoName, repoUrl, userName, userUrl }: Repository,
): Promise<void> {
	const client = new WebClient(token);
	await client.chat.postMessage({
		blocks: [
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `A new repository <${repoUrl}|\`${repoName}\`> was just created by <${userUrl}|\`${userName}\`>.`,
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
					url: `${repoUrl}/settings#danger-zone`,
				},
			},
		],
		channel,
	});
}
