import cyfConfig from "@codeyourfuture/eslint-config-standard";
import vitestEslint from "@vitest/eslint-plugin";
import tsEslint from "typescript-eslint";

const vitestEslintRecommended = vitestEslint.configs.recommended;

/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		ignores: ["lib/"],
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
	...cyfConfig.configs.standard,
	...tsEslint.configs.strict,
	...tsEslint.configs.stylistic,
	...typeScriptOnly(
		tsEslint.configs.strictTypeCheckedOnly,
		tsEslint.configs.stylisticTypeCheckedOnly,
	),
	{
		files: ["setupTests.ts", "src/**/*.test.ts"],
		...vitestEslintRecommended,
		rules: {
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			...vitestEslintRecommended.rules,
		},
	},
];

/**
 * Apply the supplied configurations only to TypeScript files.
 *
 * @param {import("eslint").Linter.Config[][]} configs
 * @returns {import("eslint").Linter.Config[]}
 */
function typeScriptOnly(...configs) {
	return configs.flat().map((config) => ({
		...config,
		files: [...(config.files ?? []), "**/*.ts"],
		languageOptions: {
			...config.languageOptions,
			parserOptions: {
				...config.languageOptions?.parserOptions,
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	}));
}
