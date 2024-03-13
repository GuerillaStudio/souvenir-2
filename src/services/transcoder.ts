import { Effect, pipe } from "effect"
import { FFmpeg } from "@ffmpeg/ffmpeg"

const loadFfmpeg = Effect.async<FFmpeg, any>((resume, signal) => {
	const ffmpeg = new FFmpeg()

	ffmpeg.on("log", console.log)
	ffmpeg.on("progress", console.log)

	ffmpeg.load(
		{
			coreURL: "/ffmpeg-wasm/ffmpeg-core.js",
		},
		{ signal }
	)
		.then(() => resume(Effect.succeed(ffmpeg)))
		.catch(error => resume(Effect.fail(error)))
})

export const fakeTranscode = (
	blob: Blob,
) => pipe(
	Effect.sleep(2000),
	Effect.flatMap(() => Effect.succeed(blob)),
)

export const transcode = (
	blob: Blob,
) => pipe(
	loadFfmpeg,
	Effect.flatMap(ffmpeg => Effect.tryPromise(async (signal) => {
		await ffmpeg.writeFile("input.webm", new Uint8Array(await blob.arrayBuffer()), { signal })
		await ffmpeg.exec(["-i", "input.webm", "output.mp4"], undefined, { signal })
		const data = await ffmpeg.readFile("output.mp4", "binary", { signal }) as Uint8Array

		await ffmpeg.deleteFile("input.webm", { signal })
		await ffmpeg.deleteFile("output.mp4", { signal })

		return new Blob([data.buffer], { type: "video/mp4" })
	}))
)
