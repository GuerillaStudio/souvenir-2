import { useState } from "preact/hooks"

export function Capture() {
	return (
		<form class="paneltop" aria-label="Capture options">
			<div class="viewer">
				<div class="viewer-container">
					<div class="viewer-content">
						<div class="viewer-label">Before everything we need your camera</div>
					</div>
				</div>
			</div>
			<div class="gridstack">
				<DurationSelector/>
				<div clas="progressbar" hidden>[TODO] progres bar</div>
			</div>
			<div class="gridstack">
				<button class="btn btn--small justify-self-center" role="button">Activate your camera</button>
				<div clas="controls" hidden>[TODO] controls</div>
			</div>
		</form>
	);
}

function DurationSelector() {
	const [duration, setDuration] = useState<number>(2000);

	return (
		<fieldset class="justify-self-center border-0">
			<legend class="sr-only">Set duration</legend>
			<div class="duration box box--inset">
				<button
					type="button"
					class="duration__btn"
					onClick={ (e)=>{e.preventDefault(); setDuration(2000);} }
					aria-pressed={ duration === 2000 ? 'true' : undefined }
					aria-label="2 seconds"
				>2s</button>
				<button
					type="button"
					class="duration__btn"
					onClick={ (e)=>{e.preventDefault(); setDuration(3000);} }
					aria-pressed={ duration === 3000 ? 'true' : undefined }
					aria-label="3 seconds"
				>3s</button>
				<button
					type="button"
					class="duration__btn"
					onClick={ (e)=>{e.preventDefault(); setDuration(5000);} }
					aria-pressed={ duration === 5000 ? 'true' : undefined }
					aria-label="5 seconds"
				>5s</button>
			</div>
		</fieldset>
	)

}
