export function StatusBar({ light = false }: { light?: boolean }) {
  return <div className="status-bar" style={light ? { color: "#fff" } : undefined}><span>9:41</span><span className="status-icons"><span className="signal"><i /><i /><i /><i /></span><span>⌁</span><span className="battery" /></span></div>;
}
