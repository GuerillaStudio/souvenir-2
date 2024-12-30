import { useLocation } from 'preact-iso';

export function Header() {
	const { url } = useLocation();

	return (
		<header class="container">
			<nav class="flex flex-wrap gap--mini" aria-labelledby="dev-nav">
				<div id="dev-nav"><span aria-hidden="true">[🚧 </span>dev navigation<span aria-hidden="true">]:</span></div>
				<a
					href="/"
					class={url == '/' && 'text-underline'}
					aria-current={url == '/' ? 'page' : null}
				>
					Home
				</a> -
				<a
					href="/capture"
					class={url == '/capture' && 'text-underline'}
					aria-current={url == '/capture' ? 'page' : null}
				>
					Capture
				</a> -
				<a
					href="/404"
					class={url == '/404' && 'text-underline'}
					aria-current={url == '/404' ? 'page' : null}
				>
					404
				</a>
			</nav>
		</header>
	);
}
