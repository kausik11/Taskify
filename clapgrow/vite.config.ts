import path from "path";
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react'
import proxyOptions from "./proxyOptions";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 8080,
		proxy: proxyOptions,
		watch: {
			ignored: [
				"**/sites/**",     // ignore frappe sites
				"**/logs/**",      // ignore log files
				"**/node_modules/**",
				"**/.git/**"
			]
		}
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		outDir: "../clapgrow_app/public/clapgrow",
		emptyOutDir: true,
		target: "es2015",
		chunkSizeWarningLimit: 700,
		sourcemap: false,
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
			mangle: true,
		},
	},
});
