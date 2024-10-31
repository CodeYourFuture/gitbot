import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			include: ["src/**"],
			reportsDirectory: "reports/coverage",
		},
		globals: true,
	},
});
