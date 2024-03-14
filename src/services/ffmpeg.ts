import { Context, Data, Effect, pipe } from "effect"
import { FFmpeg as FfmpegWasm } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

// import coreURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js?url"
// import wasmURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm?url"
// import workerURL from "../../node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js?url"


/**
 *
 */
// only want to export type
export class FfmpegError extends Data.TaggedError("FfmpegError")<{
	message: string
}> {}

/**
 * Ffmpeg Service
 *
 * See https://effect.website/docs/guides/context-management/services
 */
export class Ffmpeg extends Context.Tag("Ffmpeg")<
	Ffmpeg,
	{
		readonly exec: (args: Array<string>) => Effect.Effect<void, FfmpegError>
		readonly deleteFile: (path: string) => Effect.Effect<void, FfmpegError>
		readonly readFile: (path: string) => Effect.Effect<Uint8Array, FfmpegError>
		readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, FfmpegError>
	}
>() {}

/**
 * A utility function to make a FfmpegError from various unknow errors
 */
const makeFfmpegError = (error: unknown) => new FfmpegError({
	message: error + ""
})

/**
 *
 */
const blobUrl = (url: string, mediaType: string) => Effect.tryPromise({
	try: () => toBlobURL(url, mediaType),
	catch: makeFfmpegError,
})

/**
 * Load ffmpeg from a baseUrl
 * Downloads ffmpeg-core files and expose them as object url like suggested by ffmpegwasm docs
 * Good enough for prototyping
 * TODO: Load ffmpeg from bundled local files (so they can easily identified and precached)
 */
const loadFfmpegFromBaseUrl = (baseUrl: string) => Effect.gen(function* (_) {
	const ffmpeg = new FfmpegWasm()

	const [coreURL, wasmURL, workerURL] = yield* _(Effect.all([
		blobUrl(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
		blobUrl(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
		blobUrl(`${baseUrl}/ffmpeg-core.worker.js`, "text/javascript"),
	], { concurrency: 3 }))

	yield* _(Effect.tryPromise({
		try: signal => ffmpeg.load({ coreURL, wasmURL, workerURL }, { signal }),
		catch: makeFfmpegError,
	}))

	return ffmpeg
})

/**
 * Ffmpeg Resource
 * Logic to acquire (initialize and load) and release (terminate) a ffmpeg wasm instance
 */
const ffmpegWasmResource = Effect.acquireRelease(
	pipe(
		Effect.log("load ffmpeg from unpkg"),
		Effect.flatMap(() => loadFfmpegFromBaseUrl("https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm")),
	),
	(ffmpeg: FfmpegWasm) => pipe(
		Effect.log("terminate ffmpeg"),
		Effect.flatMap(() => Effect.sync(() => ffmpeg.terminate())),
	),
)

/**
 * Implemention of the Ffmpeg service
 */
export const ffmpeg = Effect.gen(function* (_) {
	const ffmpegWasm = yield* _(ffmpegWasmResource)

	return {
		exec: (args: Array<string>) => Effect.tryPromise({
			// no timeout support here, should use effect timeout capabilities if wanted
			try: signal => ffmpegWasm.exec(args, -1, { signal }),
			catch: makeFfmpegError,
		}),
		deleteFile: (path: string) => Effect.tryPromise({
			try: signal => ffmpegWasm.deleteFile(path, { signal }),
			catch: makeFfmpegError,
		}),
		readFile: (path: string) => Effect.tryPromise({
			try: signal => ffmpegWasm.readFile(path, "binary", { signal }) as Promise<Uint8Array>,
			catch: makeFfmpegError,
		}),
		writeFile: (path: string, data: Uint8Array) => Effect.tryPromise({
			try: signal => ffmpegWasm.writeFile(path, data, { signal }),
			catch: makeFfmpegError,
		}),
	}
})

