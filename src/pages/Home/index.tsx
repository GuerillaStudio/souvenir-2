import Logo from '../../assets/img/logo-lines.svg';

export function Home() {
	return (
		<div class="home text-center">
			<img src={Logo} alt="logo" height="160" width="160" class="inline-block" />
			<h1>Souvenir v2</h1>
			<a href="/capture" class="btn mt2">Capturer</a>
		</div>
	);
}
