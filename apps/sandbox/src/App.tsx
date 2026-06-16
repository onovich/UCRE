import "../../game/src/styles.css";

export function App() {
  return (
    <main className="app-shell" aria-label="UCRE Sandbox">
      <header className="app-header">
        <span className="app-title">UCRE Sandbox</span>
        <span className="app-status">Ready</span>
      </header>
      <section className="workspace-grid" aria-label="Workspace">
        <div className="panel">Rules Probe</div>
        <div className="panel">Presentation Probe</div>
        <div className="panel">Diagnostics</div>
      </section>
    </main>
  );
}
