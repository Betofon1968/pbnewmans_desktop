// Entry point for Logistics Dashboard (ESM/ES6) - v26.110
// Wait for required UMD globals, then dynamically import the App module and render.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForGlobals() {
  while (!(window.React && window.ReactDOM && window.supabase)) {
    await sleep(50);
  }
}

(async () => {
  await waitForGlobals();

  if (typeof window.updateProgress === 'function') {
    // Keep the existing loading UI behavior/messages from index.html
    window.updateProgress('Starting application...');
  }

  const mod = await import('./App.js?v=26.110');
  const App = mod.default;

  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error("Root element '#root' not found.");
  }

  // Render using React 18 createRoot (no build step)
  window.ReactDOM.createRoot(rootEl).render(window.React.createElement(App));

  // Match the original init behavior: fade out and remove the loading screen after render
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        if (loadingScreen && loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 300);
    }
  }, 100);
})().catch((err) => {
  console.error('Failed to start the application:', err);
  try {
    if (typeof window.updateProgress === 'function') {
      window.updateProgress('Error starting application. Check console.');
    }
  } catch (_) {}
});
