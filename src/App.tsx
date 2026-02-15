import { LabStoreProvider } from "./store/provider";
import { useLabStore } from "./store/useLabStore";
import { HubPage } from "./pages/HubPage";
import { LabPage } from "./pages/LabPage";

function AppContent() {
	const { globalUi } = useLabStore();

	if (globalUi.currentView === "hub") {
		return <HubPage />;
	}

	return <LabPage key={globalUi.currentAlgorithmId} />;
}

function App() {
	return (
		<LabStoreProvider>
			<AppContent />
		</LabStoreProvider>
	);
}

export default App;
