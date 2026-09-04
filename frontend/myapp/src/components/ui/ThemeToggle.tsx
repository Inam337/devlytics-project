import { useEffect } from 'react';

export function ThemeToggle() {
  // Dark mode has been removed - this component is now a no-op
  // Kept for backward compatibility in case it's still referenced
  useEffect(() => {
    // Ensure dark class is removed if it exists
    const root = document.documentElement;

    root.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return null;
}
