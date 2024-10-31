import cyfConfig from "@codeyourfuture/eslint-config-standard";
import vitestEslint from "@vitest/eslint-plugin";
import tsEslint from "typescript-eslint";

const vitestEslintRecommended = vitestEslint.configs.recommended;

/** @type {import("eslint").Linter.Config} */
export default [
	{
		ignores: ["lib/"],
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
	cyfConfig,
	...tsEslint.configs.strict,
	...tsEslint.configs.stylistic,
	{
		files: ["src/**/*.test.ts"],
		...vitestEslintRecommended,
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			...vitestEslintRecommended.rules,
		},
	},
];
