import { createHmac, timingSafeEqual } from "node:crypto";

import { type Button, type SectionBlock, WebClient } from "@slack/web-api";

import type { Repository } from "./types";
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

export const validatePayload = async (body: string, signature: string, timestamp: number): Promise<void> => {
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
		console.log(`Received action ${action.action_id} with value ${action.value}`);
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
	style: "danger",
	text: { type: "plain_text", text: "Delete repo" },
	url: `https://github.com/${repoName}/settings#danger-zone`,
	value: repoName,
});

const fiveMinutesAgo = () => Math.floor((Date.now() / 1_000) - (5 * 60));
