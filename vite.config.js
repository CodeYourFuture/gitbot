import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			include: ["src/**"],
			reporter: ["html", "lcovonly", "text"],
			reportsDirectory: "reports/coverage",
		},
		globals: true,
	},
});
