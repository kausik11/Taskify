import { defineConfig } from "vitest";

export default defineConfig({
	test: {
		environment: "jsdom",
		setupFiles: "./src/setupTests.ts",
		include: ["**/*.{test,spec}.{ts,tsx}"],
		globals: true,
		coverage: {
			provider: "c8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
		},
	},
});
