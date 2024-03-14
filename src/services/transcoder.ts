import { Effect, pipe } from "effect"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

// import coreURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js?url"
// import wasmURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm?url"
// import workerURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js?url"

/**
 * ffmpeg resource
 * See https://effect.website/docs/guides/resource-management
 */

const blobUrl = (url: string, mediaType: string) => Effect.tryPromise(() => toBlobURL(url, mediaType))

const loadFfmpegBlobUrl = (baseUrl: string) => Effect.gen(function* (_) {
	const ffmpeg = new FFmpeg()

	const [coreURL, wasmURL, workerURL] = yield* _(Effect.all([
		blobUrl(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
		blobUrl(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
		blobUrl(`${baseUrl}/ffmpeg-core.worker.js`, "text/javascript"),
	], { concurrency: 3 }))

	yield* _(Effect.tryPromise(signal => ffmpeg.load({ coreURL, wasmURL, workerURL }, { signal })))
	return ffmpeg
})

const ffmpegResource = Effect.acquireRelease(
	pipe(
		loadFfmpegBlobUrl("https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm"),
		Effect.tap(Effect.log("ffmpeg loaded")),
	),
	(ffmpeg: FFmpeg) => pipe(
		Effect.sync(() => ffmpeg.terminate()),
		Effect.tap(Effect.log("ffmpeg terminated")),
	),
)

export const transcode = (
	blob: Blob,
	onProgress?: (x: any) => void
) => Effect.scoped(Effect.gen(function* (_) {
	const inputPath = "input.webm"
	const outputPath =  "output.mp4"

	const ffmpeg = yield* _(ffmpegResource)

	if (onProgress) {
		ffmpeg.on("progress", onProgress)
		yield* _(Effect.addFinalizer(() => Effect.sync(() => ffmpeg.off("progress", onProgress))))
	}

	yield* _(writeFile(ffmpeg, inputPath, blob))
	yield* _(Effect.addFinalizer(() => deleteFile(ffmpeg, inputPath)))

	yield* _(exec(ffmpeg, [
		"-i", inputPath,
		"-filter:v", "crop='min(iw,ih)':'min(iw,ih)'",
		outputPath,
	]))

	yield* _(Effect.addFinalizer(() => deleteFile(ffmpeg, outputPath)))

	const data = yield* _(readFile(ffmpeg, outputPath))

	return new Blob([data.buffer], { type: "video/mp4" })
}))

const exec = (ffmpeg: FFmpeg, args: Array<string>, timeout?: number) => Effect.tryPromise(signal => ffmpeg.exec(
	args,
	timeout,
	{ signal },
))

const writeFile = (ffmpeg: FFmpeg, path: string, data: Blob) => pipe(
	Effect.logInfo(`write ${path}`),
	Effect.flatMap(() => Effect.tryPromise(async signal => ffmpeg.writeFile(
		path,
		new Uint8Array(await data.arrayBuffer()),
		{ signal }
	))),
)

const readFile = (ffmpeg: FFmpeg, path: string) => pipe(
	Effect.logInfo(`read ${path}`),
	Effect.flatMap(() => Effect.tryPromise(signal => ffmpeg.readFile(
		path,
		"binary",
		{ signal }
	) as Promise<Uint8Array>)),
)

// should use tryPromise but we need to drop the error to be usable in a finalizer
const deleteFile = (ffmpeg: FFmpeg, path: string) => pipe(
	Effect.logInfo(`delete ${path}`),
	Effect.flatMap(() => Effect.promise(signal => ffmpeg.deleteFile(path, { signal }))),
)
