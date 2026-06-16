import "../../game/src/styles.css";

export function App() {
  return (
    <main className="app-shell" aria-label="UCRE Replay Viewer">
      <header className="app-header">
        <span className="app-title">UCRE Replay Viewer</span>
        <span className="app-status">Ready</span>
      </header>
      <section className="workspace-grid" aria-label="Workspace">
        <div className="panel">Command Log</div>
        <div className="panel">State Hashes</div>
        <div className="panel">Event Hashes</div>
      </section>
    </main>
  );
}
