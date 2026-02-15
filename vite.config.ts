import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	base: "./",
	plugins: [tailwindcss(), react()],
	server: {
		proxy: {
			"/binance-api": {
				target: "https://api.binance.com",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/binance-api/, "/api/v3"),
			},
		},
	},
});
