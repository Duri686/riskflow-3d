import { useState, useLayoutEffect } from "react";

/**
 * Resolves a CSS variable to its computed value.
 * Useful for Canvas/WebGL contexts where CSS custom properties are not auto-resolved.
 *
 * @param variableName The name of the CSS variable (e.g. "--color-bt-accent")
 * @param fallback Optional fallback value if the variable is not found
 * @returns The computed value of the CSS variable
 */
export function useCSSVar(variableName: string, fallback = "#000000"): string {
	const [value, setValue] = useState<string>(fallback);

	useLayoutEffect(() => {
		if (typeof window === "undefined") return;

		const updateValue = () => {
			const computedValue = getComputedStyle(document.documentElement)
				.getPropertyValue(variableName)
				.trim();

			if (computedValue) {
				setValue(computedValue);
			}
		};

		updateValue();

		const observer = new MutationObserver(updateValue);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "style"],
		});

		return () => observer.disconnect();
	}, [variableName]);

	return value;
}
