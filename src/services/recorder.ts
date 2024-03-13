import { Effect } from "effect"

class MediaRecorderError extends Error {
	readonly _tag = "MediaRecorderError"
}

export const record = (
	media: MediaStream,
	duration: number,
	// onProgress: (progress: number) => void,
) => Effect.async<Blob, MediaRecorderError>((resume, signal) => {
	if (signal.aborted) {
		return
	}

	const chunks: Array<Blob> = []
	let mediaType: null|string = null

	let timeoutId: null|number = null
	const recorder = new MediaRecorder(media)

	recorder.onstart = () => {
		mediaType = recorder.mimeType
	}

	recorder.ondataavailable = event => {
		chunks.push(event.data)
	}

	recorder.onerror = event => resume(Effect.fail(new MediaRecorderError()))

	recorder.onstop = async () => {
		if (signal.aborted) {
			return
		}

		if (!mediaType) {
			resume(Effect.fail(new MediaRecorderError()))
			return
		}

		resume(Effect.succeed(new Blob(chunks, { type: mediaType })))
	}

	try {
		recorder.start()

		timeoutId = setTimeout(() => {
			recorder.stop()
		}, duration)
	} catch (error) {
		resume(Effect.fail(new MediaRecorderError()))
	}

	signal.onabort = () => {
		if (recorder.state !== "inactive") {
			recorder.stop()
		}

		if (timeoutId !== null) {
			clearTimeout(timeoutId)
		}
	}
})
