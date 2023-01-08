import { Config } from "jest";

const config: Config = {
	coverageDirectory: "<rootDir>/reports/coverage",
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	preset: "ts-jest/presets/default-esm",
	setupFilesAfterEnv: [
		"<rootDir>/setupTests.ts",
	],
	transform: {
		"^.+\\.ts$": ["ts-jest", { useESM: true }],
	},
};

export default config;
