import { LocationProvider, Router, Route, hydrate, prerender as ssr } from 'preact-iso';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home/index.jsx';
import { Capture } from './pages/Capture/index.jsx';
import { Test } from './pages/test.tsx';
import { NotFound } from './pages/_404.jsx';
import './assets/css/style.css';

export function App() {
	return (
		<LocationProvider>
			<Header />
			<main class="container">
				<Router>
					<Route path="/" component={Home} />
					<Route path="/capture" component={Capture} />
					<Route path="/test" component={Test} />
					<Route default component={NotFound} />
				</Router>
			</main>
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
