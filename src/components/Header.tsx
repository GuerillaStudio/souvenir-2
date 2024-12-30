import { useLocation } from 'preact-iso'

export function Header() {
	const { url } = useLocation()

	return (
		<header class="container">
			<nav class="flex flex-wrap gap--mini" aria-labelledby="dev-nav">
				<div id="dev-nav"><span aria-hidden="true">[🚧 </span>dev navigation<span aria-hidden="true">]:</span></div>
				<a
					href="/"
					class={url === '/' ? 'text-underline' : undefined}
					aria-current={url == '/' ? 'page' : undefined}
				>
					Home
				</a> -
				<a
					href="/capture"
					class={url === '/capture' ? 'text-underline' : undefined}
					aria-current={url == '/capture' ? 'page' : undefined}
				>
					Capture
				</a> -
				<a
					href="/404"
					class={url === '/404' ? 'text-underline' : undefined}
					aria-current={url == '/404' ? 'page' : undefined}
				>
					404
				</a>
			</nav>
		</header>
	);
}
