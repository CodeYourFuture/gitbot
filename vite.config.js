import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			exclude: ["**/*.d.ts"],
			include: ["src/**"],
			reporter: ["html", "lcovonly", "text"],
			reportsDirectory: "reports/coverage",
		},
		globals: true,
	},
});
