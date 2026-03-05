import App from './App.js?v=26.121';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForGlobals() {
  while (!(window.React && window.ReactDOM && window.supabase)) {
    await sleep(50);
  }
}

(async () => {
  await waitForGlobals();

  if (typeof window.updateProgress === 'function') {
    window.updateProgress('Starting application...');
  }

  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error("Root element '#root' not found.");
  }

  window.ReactDOM.createRoot(rootEl).render(window.React.createElement(App));

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
