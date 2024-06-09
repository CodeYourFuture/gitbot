import cyfConfig from "@codeyourfuture/eslint-config-standard";
import tsEslint from "typescript-eslint";
import jestEslint from "eslint-plugin-jest";

const jestEslintRecommended = jestEslint.configs["flat/recommended"];

/** @type {import("eslint").Linter.FlatConfig} */
export default [
	{
		ignores: ["lib/"],
	},
	cyfConfig,
	...tsEslint.configs.strict,
	...tsEslint.configs.stylistic,
	{
		files: ["src/**/*.test.ts"],
		...jestEslintRecommended,
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			...jestEslintRecommended.rules,
		},
	},
];
