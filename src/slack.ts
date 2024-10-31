import { createHmac, timingSafeEqual } from "node:crypto";

import type { ActionsBlock, Button, MrkdwnElement, PlainTextElement, SectionBlock } from "@slack/web-api";
import { WebClient } from "@slack/web-api";

import type { Maybe, MessageRef, Repository } from "./types.js";
import { getConfig } from "./utils.js";

const DELETE_ACTION_ID = "delete-repository";
const DISMISS_ACTION_ID = "dismiss-deletion";
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

export async function updateMessage({ action, messageTs, repo, userId, userName }: MessageRef): Promise<void> {
	const channel = getConfig("SLACK_CHANNEL");
	const client = new WebClient(getConfig("SLACK_TOKEN"));
	const text = action === "delete"
		? `Repository ${repo.repoName} was deleted by ${userName}.`
		: `Deletion of repository ${repo.repoName} was dismissed by ${userName}.`;
	console.log(text);
	await client.chat.update({
		blocks: [repoSection(repo)],
		channel,
		text: createdText(repo),
		ts: messageTs,
	});
	await client.reactions.add({
		channel,
		name: action === "delete" ? "wastebasket" : "recycle",
		timestamp: messageTs,
	});
	await client.chat.postMessage({
		blocks: [{
			text: markdown(action === "delete"
				? `Repository was deleted by <@${userId}>.`
				: `Deletion was dismissed by <@${userId}>.`),
			type: "section",
		}],
		channel,
		text,
		thread_ts: messageTs,
	});
}

export async function notifyChannel(repo: Repository): Promise<void> {
	const channel = getConfig("SLACK_CHANNEL");
	const client = new WebClient(getConfig("SLACK_TOKEN"));
	const text = createdText(repo);
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
	const payload = JSON.parse(Object.fromEntries(new URLSearchParams(body).entries()).payload) as SlackInteraction;
	return getPayload(payload);
};

const actionsSection = (repo: Repository): ActionsBlock => ({
	elements: [
		dismissButton(repo),
		deleteButton(repo),
	],
	type: "actions",
});

const createdText = ({ repoName, userLogin, userName }: Repository): string =>
	`A new repository ${repoName} was just created by ${userName ?? userLogin}`;

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

const dismissButton = (repo: Repository): Button => ({
	action_id: DISMISS_ACTION_ID,
	text: plainText("Dismiss"),
	type: "button",
	value: JSON.stringify(repo),
});

const fiveMinutesAgo = () => Math.floor((Date.now() / 1_000) - (5 * 60));

const getPayload = ({ actions = [], message, user }: SlackInteraction): Maybe<MessageRef> => {
	const action = actions.find(({ action_id }) => [DELETE_ACTION_ID, DISMISS_ACTION_ID].includes(action_id ?? ""));
	if (action?.value) {
		const repo = JSON.parse(action.value) as Repository;
		return {
			action: action.action_id === DELETE_ACTION_ID ? "delete" : "dismiss",
			messageTs: message.ts,
			repo,
			userId: user.id,
			userName: user.username,
		};
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

const repoSection = ({ repoName, repoUrl, userLogin, userName, userUrl }: Repository): SectionBlock => {
	const lines = [
		`A new repository <${repoUrl}|\`${repoName}\`> was just created by <${userUrl}|${userName ? userName : `\`${userLogin}\``}>.`,
	];
	const match = /-\d+$/.exec(repoUrl);
	if (match !== null) {
		lines.push(`:redflag: *The \`${match[0]}\` makes this likely a mistake.*`);
	}
	return ({
		type: "section",
		text: markdown(lines.join("\n")),
	});
};
