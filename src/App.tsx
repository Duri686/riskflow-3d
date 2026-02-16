import { Routes, Route, Navigate } from "react-router-dom";
import { HubPage } from "./pages/HubPage";
import { LabPage } from "./pages/LabPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
	return (
		<ErrorBoundary>
			<Routes>
				<Route path="/" element={<HubPage />} />
				<Route path="/lab/:id" element={<LabPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</ErrorBoundary>
	);
}

export default App;
