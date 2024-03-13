import { defineConfig } from "vite"
import preact from "@preact/preset-vite"

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		preact({
			prerender: {
				enabled: true,
				renderTarget: "#app",
				additionalPrerenderRoutes: ["/404"],
			},
		}),
	],
	optimizeDeps: {
		exclude: [
			/**
			 * Vite had issues when loading ffmpeg without it
			 * Not documented on ffmpeg website, found in examples using vite
			 */
			"@ffmpeg/ffmpeg",
			"@ffmpeg/util"
		],
	},
	server: {
		headers: {
			/**
			 * Enable cross origin isolation
			 * Without it SharedArrayBuffer is not available and multithreaded ffmpeg needs it
			 * Performances are really degraded in mono thread mode
			 *
			 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements
			 * See https://ffmpegwasm.netlify.app/docs/performance/
			 */
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		}
	}
})
