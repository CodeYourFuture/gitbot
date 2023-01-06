import type { Maybe } from "./types";

export function getConfig(name: string, required?: true): string;
export function getConfig(name: string, required: false): Maybe<string>;
export function getConfig (name: string, required = true): Maybe<string> {
	const value = process.env[name];
	if (required && !value) {
		throw new Error(`missing configuration ${name}`);
	}
	return value;
}
