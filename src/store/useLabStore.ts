import { useContext } from "react";
import { LabStoreContext } from "./context";

export const useLabStore = () => {
	const context = useContext(LabStoreContext);

	if (!context) {
		throw new Error("useLabStore must be used within LabStoreProvider");
	}

	return context;
};
