import type { ReactNode } from "react";
import type { LabStatusModel } from "@/components/ui/LabStatusStrip";

export interface LabWorkspaceProps {
	onSidebar: (node: ReactNode) => void;
	onHeaderAction: (node: ReactNode) => void;
	onStatus: (model: LabStatusModel | null) => void;
}
