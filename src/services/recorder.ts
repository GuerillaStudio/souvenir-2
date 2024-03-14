import { Effect } from "effect"

class RecordError extends Error {
	readonly _tag = "MediaRecorderError"
}

export const record = (
	media: MediaStream,
	duration: number,
	onProgress?: (progress: WaitProgress) => void,
) => Effect.async<Blob, RecordError>((resume, signal) => {
	if (signal.aborted) {
		return
	}

	const chunks: Array<Blob> = []
	let mediaType: null|string = null

	const recorder = new MediaRecorder(media)

	recorder.onstart = () => {
		mediaType = recorder.mimeType
	}

	recorder.ondataavailable = event => {
		chunks.push(event.data)
	}

	recorder.onerror = event => resume(Effect.fail(new RecordError("RecorderEventError")))

	recorder.onstop = async () => {
		if (signal.aborted) {
			return
		}

		if (!mediaType) {
			resume(Effect.fail(new RecordError("MissingMediaType")))
			return
		}

		resume(Effect.succeed(new Blob(chunks, { type: mediaType })))
	}

	let cancelWait: null|CancelWait = null

	try {
		recorder.start()

		cancelWait = wait(duration, () => {
			recorder.stop()
		}, { onProgress })
	} catch (error) {
		resume(Effect.fail(new RecordError("RecorderStartError")))
	}

	signal.onabort = () => {
		if (recorder.state !== "inactive") {
			recorder.stop()
		}

		if (cancelWait) {
			cancelWait()
		}
	}
})

interface WaitOptions {
	readonly onProgress?: (progress: WaitProgress) => void
	readonly progressInterval?: number
}

interface CancelWait {
	(): void
}

class WaitProgress {
	readonly elapsed: number
	readonly total: number

	constructor(elapsed: number, total: number) {
		this.elapsed = elapsed
		this.total = total
	}
}

function wait(
	delay: number,
	callback: () => void,
	{ onProgress, progressInterval = 100 }: WaitOptions = {}
): CancelWait {
	const started = Date.now()

	let progressIntervalId: null|number = null

	if (onProgress) {
		progressIntervalId = setInterval(() => {
			onProgress(new WaitProgress(Date.now() - started, delay))
		}, progressInterval)
	}

	const doneTimeoutId = setTimeout(() => {
		if (progressIntervalId) {
			clearInterval(progressIntervalId)
		}

		callback()
	}, delay)

	return () => {
		clearTimeout(doneTimeoutId)

		if (progressIntervalId) {
			clearInterval(progressIntervalId)
		}
	}
}
