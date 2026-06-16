import "./styles.css";

interface AppProps {
  appName?: string;
}

export function App({ appName = "UCRE Game" }: AppProps) {
  return (
    <main className="app-shell" aria-label={appName}>
      <header className="app-header">
        <span className="app-title">{appName}</span>
        <span className="app-status">Ready</span>
      </header>
      <section className="workspace-grid" aria-label="Workspace">
        <div className="panel">Command Queue</div>
        <div className="panel">Game State</div>
        <div className="panel">Event Log</div>
      </section>
    </main>
  );
}
