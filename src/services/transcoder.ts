import { Effect, Scope, pipe } from "effect"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

// import coreURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js?url"
// import wasmURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm?url"
// import workerURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js?url"

/**
 * ffmpeg resource
 * See https://effect.website/docs/guides/resource-management
 */
const ffmpegResource = Effect.acquireRelease(
	Effect.tryPromise(async signal => {
		const ffmpeg = new FFmpeg()

		// ffmpeg.on("log", console.log)
		// ffmpeg.on("progress", console.log)

		// Load ffmpeg from CDN like demonstrated in documentation
		const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm"

		await ffmpeg.load({
			coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
			wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
			workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
		}, { signal })

		return ffmpeg
	}),
	(ffmpeg: FFmpeg) => Effect.sync(() => ffmpeg.terminate()),
)

export const transcode = (
	blob: Blob,
) => Effect.scoped(
	pipe(
		ffmpegResource,
		Effect.flatMap(ffmpeg => Effect.tryPromise(async (signal) => {
			await ffmpeg.writeFile("input.webm", new Uint8Array(await blob.arrayBuffer()), { signal })

			await ffmpeg.exec([
				"-i", "input.webm",
				"-filter:v", "crop='min(iw,ih)':'min(iw,ih)'",
				"output.mp4",
			], undefined, { signal })

			const data = await ffmpeg.readFile("output.mp4", "binary", { signal }) as Uint8Array

			await ffmpeg.deleteFile("input.webm", { signal })
			await ffmpeg.deleteFile("output.mp4", { signal })

			return new Blob([data.buffer], { type: "video/mp4" })
		}))
	)
)
