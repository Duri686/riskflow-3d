import { useState, useLayoutEffect } from 'react';

/**
 * Resolves a CSS variable to its computed value.
 * Useful for using CSS variables in Canvas/WebGL contexts (like Three.js) where 
 * CSS custom properties are not automatically resolved.
 * 
 * @param variableName The name of the CSS variable (e.g., '--color-rf-primary')
 * @param fallback Optional fallback value if the variable is not found
 * @returns The computed value of the CSS variable
 */
export function useCSSVar(variableName: string, fallback: string = '#000000'): string {
  const [value, setValue] = useState<string>(fallback);

  useLayoutEffect(() => {
    // Check if window is defined (for SSR safety)
    if (typeof window === 'undefined') return;

    const updateValue = () => {
      const computedValue = getComputedStyle(document.documentElement)
        .getPropertyValue(variableName)
        .trim();
      
      if (computedValue) {
        setValue(computedValue);
      }
    };

    // Initial read
    updateValue();

    // Setup observer for theme changes (if any class on html/body changes)
    const observer = new MutationObserver(updateValue);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => observer.disconnect();
  }, [variableName]);

  return value;
}
