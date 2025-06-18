import type { JSX } from "preact"
import { useState, useRef, useEffect } from "preact/hooks"
import { record } from "../services/recorder"
import { transcode } from "../services/transcoder"

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
	const media = useCameraVideo()

	if (!media) {
		return <div>Accessing your camera ...</div>
	}

	const runRecord = () => {
		const cancel = record(
			media,
			2000,
			onRecord,
			console.error,
			progress => console.debug(`${Math.floor(progress.elapsed / progress.total * 100)}%`),
		)
	}

	return (
		<div>
			<VideoSrcObject srcObject={media} autoplay />
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
		const cancel = transcode(
			source,
			{
				format: "mp4",
				filter: "sepia",
				boomerang: false,
				glitch: false,
			},
			setTranscoded,
			console.error,
		)

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
			{transcoded.type.startsWith("image/") ?
				<img src={transcodedUrl} />
			: transcoded.type.startsWith("video/") ?
				<video src={transcodedUrl} autoplay loop />
			:
				<div>Unsupported media</div>
			}
		</div>
	)
}

interface VideoSrcObjectProps extends JSX.VideoHTMLAttributes<HTMLVideoElement> {
	srcObject?: MediaProvider
}

function VideoSrcObject({ srcObject, ...props }: VideoSrcObjectProps) {
	const ref = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (!ref.current) return

		ref.current.srcObject = srcObject ?? null
	}, [srcObject])

	return <video ref={ref} {...props}></video>
}

function useCameraVideo(): null|MediaStream {
	const [stream, setStream] = useState<null|MediaStream>(null)

	useEffect(() => {
		let ref: null|MediaStream = null

		navigator.mediaDevices.getUserMedia({ video: true, audio: false, })
			.then(stream => {
				console.log('[useCameraVideo] acquire video stream')
				setStream(ref = stream)
			})
			.catch(console.error)

		return () => {
			if (ref) {
				console.log('[useCameraVideo] release video stream')
				ref.getTracks().forEach(track => track.stop())
			}
		}
	}, [])

	return stream
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
