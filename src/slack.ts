import { createHmac, timingSafeEqual } from "node:crypto";

import { type Button, type SectionBlock, WebClient } from "@slack/web-api";

import type { Maybe, Repository, RepoRef } from "./types";
import { getConfig } from "./utils.js";

export const SIGNATURE_HEADER = "x-slack-signature";
export const TIMESTAMP_HEADER = "x-slack-request-timestamp";
const VERSION = "v0";

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

export const validatePayload = async (body: string, signature: string, timestamp: number): Promise<Maybe<RepoRef>> => {
	const [version, hash] = signature.split("=");
	if (version !== VERSION) {
		throw new Error("invalid signature version");
	}
	if (timestamp < fiveMinutesAgo()) {
		throw new Error("timestamp too old");
	}
	const hmac = createHmac("sha256", getConfig("SLACK_SIGNING_SECRET"));
	hmac.update([VERSION, timestamp, body].join(":"));
	if (!timingSafeEqual(Buffer.from(hash), Buffer.from(hmac.digest("hex")))) {
		throw new Error("payload validation failed");
	}
	const payload = JSON.parse(Object.fromEntries(new URLSearchParams(body).entries()).payload);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const action = payload.actions?.find(({ action_id }: any) => action_id === "delete-repo");
	if (action) {
		const [owner, repo] = action.value.split("/");
		return { owner, repo };
	}
};

const repoSection = ({ repoName, repoUrl, userLogin, userName, userUrl }: Repository): SectionBlock => ({
	type: "section",
	text: {
		type: "mrkdwn",
		text: `A new repository <${repoUrl}|\`${repoName}\`> was just created by <${userUrl}|${userName ? userName : `\`${userLogin}\``}>.`,
	},
	accessory: deleteButton(repoName),
});

const deleteButton = (repoName: string): Button => ({
	type: "button",
	action_id: "delete-repo",
	confirm: {
		confirm: { text: "Yes", type: "plain_text" },
		deny: { text: "No", type: "plain_text" },
		style: "danger",
		text: {
			text: `Are you sure you want to delete the repository \`${repoName}\`? This cannot be undone.`,
			type: "mrkdwn",
		},
		title: { text: "Delete the repository?", type: "plain_text" },
	},
	style: "danger",
	text: { type: "plain_text", text: "Delete repo" },
	value: repoName,
});

const fiveMinutesAgo = () => Math.floor((Date.now() / 1_000) - (5 * 60));
