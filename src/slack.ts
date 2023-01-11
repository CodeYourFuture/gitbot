import { createHmac, timingSafeEqual } from "node:crypto";

import type { ActionsBlock, Button, MrkdwnElement, PlainTextElement, SectionBlock } from "@slack/web-api";
import { WebClient } from "@slack/web-api";

import type { Maybe, Repository, MessageRef } from "./types";
import { getConfig } from "./utils.js";

const DELETE_ACTION_ID = "delete-repository";
export const SIGNATURE_HEADER = "x-slack-signature";
export const TIMESTAMP_HEADER = "x-slack-request-timestamp";
const VERSION = "v0";

interface SlackInteraction {
	actions: Button[];
	channel: {
		id: string;
		name: string;
	};
	message: {
		ts: string;
	};
	response_url: string;
	type: "block_actions";
	user: {
		id: string;
		team_id: string;
		username: string;
	};
}

export async function updateMessage({ messageTs, repo: { repoName }, userId, userName }: MessageRef): Promise<void> {
	const client = new WebClient(getConfig("SLACK_TOKEN"));
	const channel = getConfig("SLACK_CHANNEL");
	const text = `Repository ${repoName} was deleted by ${userName}.`;
	console.log(text);
	await client.reactions.add({
		channel,
		name: "wastebasket",
		timestamp: messageTs,
	});
	await client.chat.postMessage({
		channel,
		blocks: [{ text: markdown(`Repository was deleted by <@${userId}>.`), type: "section" }],
		text,
		thread_ts: messageTs,
	});
}

export async function notifyChannel(repo: Repository): Promise<void> {
	const channel = getConfig("SLACK_CHANNEL");
	const token = getConfig("SLACK_TOKEN");
	const client = new WebClient(token);
	const text = `A new repository ${repo.repoName} was just created by ${repo.userName ?? repo.userLogin}`;
	console.log(text);
	await client.chat.postMessage({
		blocks: [
			repoSection(repo),
			actionsSection(repo),
		],
		channel,
		text,
	});
}

export const validatePayload = (body: string, signature: string, timestamp: number): Maybe<MessageRef> => {
	if (!isValid(body, signature, timestamp)) {
		throw new Error("payload validation failed");
	}
	return getPayload(JSON.parse(Object.fromEntries(new URLSearchParams(body).entries()).payload));
};

const actionsSection = (repo: Repository): ActionsBlock => ({
	elements: [
		deleteButton(repo),
	],
	type: "actions",
});

const deleteButton = (repo: Repository): Button => ({
	type: "button",
	action_id: DELETE_ACTION_ID,
	confirm: {
		confirm: plainText("Yes"),
		deny: plainText("No"),
		style: "danger",
		text: plainText(`Are you sure you want to delete the repository ${repo.repoName}? This cannot be undone.`),
		title: plainText("Delete the repository?"),
	},
	style: "danger",
	text: plainText("Delete repo"),
	value: JSON.stringify(repo),
});

const fiveMinutesAgo = () => Math.floor((Date.now() / 1_000) - (5 * 60));

const getPayload = ({ actions = [], message, user }: SlackInteraction): Maybe<MessageRef> => {
	const action = actions.find(({ action_id }) => action_id === DELETE_ACTION_ID);
	if (action && action.value) {
		const repo: Repository = JSON.parse(action.value);
		return { messageTs: message.ts, repo, userId: user.id, userName: user.username };
	}
};

const isValid = (body: string, signature: string, timestamp: number): boolean => {
	const [version, hash] = signature.split("=");
	if (version !== VERSION) {
		throw new Error("invalid signature version");
	}
	if (timestamp < fiveMinutesAgo()) {
		throw new Error("timestamp too old");
	}
	const hmac = createHmac("sha256", getConfig("SLACK_SIGNING_SECRET"));
	hmac.update([VERSION, timestamp, body].join(":"));
	return timingSafeEqual(Buffer.from(hash), Buffer.from(hmac.digest("hex")));
};

const markdown = (text: string): MrkdwnElement => ({ text, type: "mrkdwn" });

const plainText = (text: string): PlainTextElement => ({ text, type: "plain_text" });

const repoSection = ({ repoName, repoUrl, userLogin, userName, userUrl }: Repository): SectionBlock => ({
	type: "section",
	text: markdown(
		`A new repository <${repoUrl}|\`${repoName}\`> was just created by <${userUrl}|${userName ? userName : `\`${userLogin}\``}>.`,
	),
});
