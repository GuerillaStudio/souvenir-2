import { Context, Data, Effect } from "effect"
import { FFmpeg as FfmpegWasm } from "@ffmpeg/ffmpeg"
import coreURL from "@ffmpeg/core?url"
import wasmURL from "@ffmpeg/core/wasm?url"

// Support for multi threaded ffmpeg needs https://github.com/ffmpegwasm/ffmpeg.wasm/pull/760
// import mtCoreURL from "@ffmpeg/core-mt?url"
// import mtWasmURL from "@ffmpeg/core-mt/wasm?url"
// import mtWorkerURL from "@ffmpeg/core-mt/worker?url"

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
 * A utility function to create effect from promises with a FfmpegError in the exception channel
 */
const ffmpegTryPromise = <A>(try_: (signal: AbortSignal) => PromiseLike<A>) => Effect.tryPromise({
	try: try_,
	catch: error => new FfmpegError({
		message: String(error)
	})
})

/**
 * Ffmpeg Resource
 * Logic to acquire (initialize and load) and release (terminate) a ffmpeg wasm instance
 */
const ffmpegWasmResource = Effect.acquireRelease(
	Effect.gen(function* () {
		yield* Effect.logDebug("load ffmpeg")
		const ffmpeg = new FfmpegWasm()
		yield* ffmpegTryPromise(signal => ffmpeg.load({ coreURL, wasmURL }, { signal }))
		return ffmpeg
	}),
	(ffmpeg: FfmpegWasm) => Effect.gen(function* () {
		yield* Effect.logDebug("terminate ffmpeg")
		yield* Effect.sync(() => ffmpeg.terminate())
	}),
)

/**
 * Implemention of the Ffmpeg service
 */
export const ffmpeg = Effect.gen(function* () {
	const ffmpegWasm = yield* ffmpegWasmResource

	// for debug purpose, to remove or expose
	ffmpegWasm.on("log", ({ type, message }) => console.debug(`[${type}]${message}`))

	return {
		exec: (args: Array<string>) => ffmpegTryPromise(
			// no timeout support here, should use effect timeout capabilities if wanted
			signal => ffmpegWasm.exec(args, -1, { signal })
		),
		deleteFile: (path: string) => ffmpegTryPromise(
			signal => ffmpegWasm.deleteFile(path, { signal })
		),
		readFile: (path: string) => ffmpegTryPromise(
			signal => ffmpegWasm.readFile(path, "binary", { signal }) as Promise<Uint8Array>
		),
		writeFile: (path: string, data: Uint8Array) => ffmpegTryPromise(
			signal => ffmpegWasm.writeFile(path, data, { signal })
		),
	}
})

