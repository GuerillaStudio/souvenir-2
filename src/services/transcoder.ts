import { Cause, Effect, Exit, pipe } from "effect"
import { Ffmpeg, FfmpegError, ffmpeg } from "./ffmpeg.ts"

// Add mediaType from/to extension

// TODO: Define transcoding configuration API :
// - a required format
// - a optional filter (grayscale, sepia, etc)
// - optional effects (boomerang, glitch, etc)

const formats = {
	"mp4": "video/mp4",
	// "gif": "image/gif", // broken ?
} as const

interface Configuration {
	format: keyof typeof formats
	filter: "none" | "grayscale" | "sepia"
	boomerang: boolean
	glitch: boolean
}

const toFfmpegArgs = (configuration: Configuration): Array<string> => {
	const filters = [
		"crop='min(iw\,ih)':'min(iw\,ih)'"
	]

	if (configuration.filter === "grayscale") {
		filters.push("colorchannelmixer='.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3'")
	} else if (configuration.filter === "sepia") {
		filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131")
	}

	if (configuration.boomerang) {
		filters.push("[0]reverse[r];[0][r]concat=n=2:v=1:a=0")
	}

	if (configuration.glitch) {
		throw new Error("Not implemented")
	}

	return [
		"-filter_complex", filters.join(",")
	]
}


/**
 * The implementation of transcode
 *
 */
const transcodeImpl = (
	input: Blob,
	configuration: Configuration,
) => Effect.gen(function* () {
	// Access Ffmpeg service
	// We now have a requirement to Ffmpeg
	const ffmpeg = yield* Ffmpeg

	// Input and output are hardcoded for now
	const inputPath = "input.webm"
	const outputPath =  "output.mp4"

	// Write the
	yield* Effect.logDebug("write input file")
	const buffer = yield* Effect.promise(() => input.arrayBuffer())
	yield* ffmpeg.writeFile(inputPath, new Uint8Array(buffer))

	// We ensure the previsouly created input file is deleted no matter what by adding a finalizer
	yield* Effect.addFinalizer(() => Effect.ignore(pipe(
		Effect.logDebug("delete input file"),
		Effect.tap(ffmpeg.deleteFile(inputPath)),
	)))

	const args = toFfmpegArgs(configuration)

	yield* Effect.logInfo(`execute ffmpeg with ${args.join(" ")}`)
	const errorCode = yield* ffmpeg.exec(["-i", inputPath, ...args, outputPath]) // we could add a timeout here
	yield* Effect.logDebug(`Error code : ${errorCode}`)


	// Same as before but for the output file created by ffmpeg
	yield* Effect.addFinalizer(() => Effect.ignore(pipe(
		Effect.logDebug("delete output file"),
		Effect.tap(ffmpeg.deleteFile(outputPath)),
	)))

	yield* Effect.logDebug("read output file")
	const data = yield* ffmpeg.readFile(outputPath)
	return new Blob([data.buffer], { type: formats[configuration.format] })
})

/**
 * The exposed transcode function
 * Interruptible, dispose its resources and hiding all Effect specifities by a simple API
 */
// We currently expose Cause.Cause in onFailure callback, would be great to not expose Effect API
// Would also allow us to not call onFailure for some Cause like Interrupt
export const transcode = (
	input: Blob,
	configuration: Configuration,
	onSuccess: (output: Blob) => void,
	onFailure: (error: Cause.Cause<FfmpegError>) => void,
) => pipe(
	transcodeImpl(input, configuration),
	Effect.provideServiceEffect(Ffmpeg, ffmpeg),
	Effect.scoped,
	effect => Effect.runCallback(effect, {onExit: exit => Exit.match(exit, {onSuccess, onFailure}) })
)

// Alternatives API to brainstorm instead of the current continuation-passing style
// - destructured return : `(Blob) => [Promise, Cancel]` or `(Blob) => {promise: Promise, cancel: Cancel}`
// - cancelable promise :`(Blob) => Promise & { cancel: Cancel }
