import { Routes, Route, Navigate } from "react-router-dom";
import { HubPage } from "./pages/HubPage";
import { LabPage } from "./pages/LabPage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<HubPage />} />
			<Route path="/lab/:id" element={<LabPage />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

export default App;
