import { Cause, Effect, Exit, pipe } from "effect"
import { Ffmpeg, FfmpegError, ffmpeg } from "./ffmpeg.ts"

// Add mediaType from/to extension

// TODO: Define transcoding configuration API :
// - a required format
// - a optional filter (grayscale, sepia, etc)
// - optional effects (boomerang, glitch, etc)

interface Configuration {}

const toFfmpegArgs = (configuration: Configuration): Array<string> => [
	// Video filters
	"-filter:v", [
		"crop='min(iw\,ih)':'min(iw\,ih)'", // Square crop
		// "colorchannelmixer='.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3'", // Grayscale filter (broken)
		// "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131", // Sepia filter (broken)
	].join(","),
]

// "-filter_complex", "[0]reverse[r];[0][r]concat=n=2:v=1:a=0" // wip boomerang

/**
 * The implementation of transcode
 *
 */
const transcodeImpl = (
	input: Blob,
	configuration: Configuration = {}
) => Effect.gen(function* (_) {
	// Access Ffmpeg service
	// We now have a requirement to Ffmpeg
	const ffmpeg = yield* _(Ffmpeg)

	// Input and output are hardcoded for now
	const inputPath = "input.webm"
	const outputPath =  "output.mp4"

	// Write the
	yield* _(Effect.logInfo("write input file"))
	const buffer = yield* _(Effect.promise(() => input.arrayBuffer()))
	yield* _(ffmpeg.writeFile(inputPath, new Uint8Array(buffer)))

	// We ensure the previsouly created input file is deleted no matter what by adding a finalizer
	yield* _(Effect.addFinalizer(() => Effect.ignore(pipe(
		Effect.logInfo("delete input file"),
		Effect.tap(ffmpeg.deleteFile(inputPath)),
	))))

	const args = toFfmpegArgs(configuration)

	yield* _(Effect.logInfo(`execute ffmpeg with ${args.join(" ")}`))
	yield* _(ffmpeg.exec(["-i", inputPath, ...args, outputPath])) // we could add a timeout here

	// Same as before but for the output file created by ffmpeg
	yield* _(Effect.addFinalizer(() => Effect.ignore(pipe(
		Effect.logInfo("delete output file"),
		Effect.tap(ffmpeg.deleteFile(outputPath)),
	))))

	yield* _(Effect.logInfo("read output file"))
	const data = yield* _(ffmpeg.readFile(outputPath))
	return new Blob([data.buffer], { type: "video/mp4" })
})

/**
 * The exposed transcode function
 * Interruptible, dispose its resources and hiding all Effect specifities by a simple API
 */
// We currently expose Cause.Cause in onFailure callback, would be great to not expose Effect API
// Would also allow us to not call onFailure for some Cause like Interrupt
export const transcode = (
	input: Blob,
	onSuccess: (output: Blob) => void,
	onFailure: (error: Cause.Cause<FfmpegError>) => void,
) => pipe(
	transcodeImpl(input),
	Effect.provideServiceEffect(Ffmpeg, ffmpeg),
	Effect.scoped,
	effect => Effect.runCallback(effect, {onExit: exit => Exit.match(exit, {onSuccess, onFailure }) })
)

// Alternatives API to brainstorm instead of the current continuation-passing style
// - destructured return : `(Blob) => [Promise, Cancel]` or `(Blob) => {promise: Promise, cancel: Cancel}`
// - cancelable promise :`(Blob) => Promise & { cancel: Cancel }
