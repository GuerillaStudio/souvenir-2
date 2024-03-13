import type { JSX } from "preact"
import { useState, useRef, useEffect } from "preact/hooks"
import { Effect, Exit } from "effect"
import { record } from "../services/recorder"
import { fakeTranscode, transcode } from "../services/transcoder"

/**
 * Prototype used for initial testing
 */
export function Test() {
	const [video, setVideo] = useState<null|Blob>(null)

	return (
		<div>
			{!video && <Recorder onRecord={setVideo}/>}

			{video && <button type="button" onClick={() => setVideo(null)}>Reset</button>}
			{video && <Transcoder source={video}/>}
		</div>
	);
}

/**
 * Access camera, display live video feed and record video on user action
 * Recorded videos are exposed by the onRecord prop
 */
function Recorder({ onRecord }: { onRecord: (blob: Blob) => void }) {
	const [media, setMedia] = useState<null|MediaStream>(null)

	useEffect(() => {
		console.log('Ask camera')
		navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false,
		}).then(setMedia).catch(console.error)
	}, [])

	if (!media) {
		return <div>Accessing your camera ...</div>
	}

	const runRecord = () => {
		Effect.runPromise(record(media, 2000))
			.then(onRecord)
			.catch(console.error)
	}

	return (
		<div>
			<Video srcObject={media} autoplay/>
			<button type="button" onClick={runRecord}>Record</button>
		</div>
	)
}

/**
 * Transcode source and display resulting video
 */
function Transcoder({ source }: { source: Blob }) {
	const [transcoded, setTranscoded] = useState<null|Blob>(null)

	useEffect(() => {
		// For now this is a fake transcoding because I have issues between vite and ffmpeg
		const cancel = Effect.runCallback(fakeTranscode(source), {
			onExit: exit => Exit.match(exit, {
				onSuccess: setTranscoded,
				onFailure: console.error,
			})
		})

		return () => {
			cancel()
		}
	}, [source])

	if (!transcoded) {
		return <div>Transcoding ...</div>
	}

	// as of march 2023 a object url is needed because only Safari has full supports of srcObject
	// https://caniuse.com/?search=srcObject
	const transcodedUrl = useObjectUrl(transcoded)

	return (
		<div>
			<Video src={transcodedUrl} autoplay loop/>
		</div>
	)
}

interface VideoProps extends JSX.HTMLAttributes<HTMLVideoElement> {
	srcObject?: MediaProvider
}

function Video({ srcObject, ...props }: VideoProps) {
	const ref = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (!ref.current) return

		ref.current.srcObject = srcObject ?? null
	}, [srcObject])

	return <video ref={ref} {...props}></video>
}

/**
 * Create a object url for the source
 * Object url is revoked when hook is unmounted
 */
function useObjectUrl(source: Blob|MediaSource): string {
	console.log('[useObjectUrl] acquire object url')
	const ref = useRef(URL.createObjectURL(source))

	useEffect(() => {
		return () => {
			console.log('[useObjectUrl] release object url')
			URL.revokeObjectURL(ref.current)
		}
	}, [])

	return ref.current
}
