import "../../game/src/styles.css";

export function App() {
  return (
    <main className="app-shell" aria-label="UCRE Editor">
      <header className="app-header">
        <span className="app-title">UCRE Editor</span>
        <span className="app-status">Ready</span>
      </header>
      <section className="workspace-grid" aria-label="Workspace">
        <div className="panel">Cards</div>
        <div className="panel">Enemies</div>
        <div className="panel">Validation</div>
      </section>
    </main>
  );
}
