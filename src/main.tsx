import { StrictMode } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root container not found");
}

// 在 GitHub Pages 上使用 HashRouter 以避免刷新 404；本地与自有服务器使用 BrowserRouter 提供无 # 的美观 URL
const isGhPages = typeof window !== "undefined" && /github\.io$/.test(window.location.hostname);
const Router: React.ComponentType<React.PropsWithChildren> = isGhPages ? (HashRouter as any) : (BrowserRouter as any);

createRoot(rootElement).render(
	<StrictMode>
		<Router>
			<App />
		</Router>
	</StrictMode>,
);
