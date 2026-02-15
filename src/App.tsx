import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { DEFAULT_ALGORITHM_ID } from "./algorithms/registry";
import { LabStoreProvider } from "./store/provider";
import { HubPage } from "./pages/HubPage";
import { LabPage } from "./pages/LabPage";

function AppRoutes() {
	const location = useLocation();
	const routeKey = location.key || location.pathname;

	return (
		<Routes location={location} key={routeKey}>
			<Route path="/" element={<HubPage />} />
			<Route path="/lab/:algorithmId" element={<LabPage key={routeKey} />} />
			<Route
				path="*"
				element={<Navigate to={`/lab/${DEFAULT_ALGORITHM_ID}`} replace />}
			/>
		</Routes>
	);
}

function App() {
	return (
		<LabStoreProvider>
			<BrowserRouter>
				<AppRoutes />
			</BrowserRouter>
		</LabStoreProvider>
	);
}

export default App;
