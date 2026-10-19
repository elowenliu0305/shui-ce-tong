import { useState } from "react";

import { useAppContext } from "../../app/app-context";

export function FavoriteButton({ documentId, initial }: { documentId: string; initial: boolean }) {
  const { session, dependencies, refresh } = useAppContext();
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  return <button className={`favorite-button ${favorite ? "active" : ""}`} aria-pressed={favorite} disabled={busy} onClick={async () => { if (!session) return; setBusy(true); const next = !favorite; const result = await dependencies.knowledge.setFavorite(session.accountId, documentId, next); setBusy(false); if (result.ok) { setFavorite(next); refresh(); } }}>{favorite ? "♥ 已收藏" : "♡ 收藏"}</button>;
}
