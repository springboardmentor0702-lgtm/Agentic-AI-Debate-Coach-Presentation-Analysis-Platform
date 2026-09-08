export default function Footer() {
  return (
    <footer className="footer">
      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>LOGOS.AI</div>
      <div>© 2026 RHETORICAL INTELLIGENCE SYSTEMS. ALL RIGHTS RESERVED.</div>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">API_DOCS</a>
        <span>SYSTEM_STATUS: 100% OPERATIONAL</span>
      </div>
    </footer>
  );
}
