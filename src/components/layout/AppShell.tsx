import { Outlet } from "react-router-dom";

import { BottomNav } from "./BottomNav";
import { MobileCanvas } from "./MobileCanvas";

export function AppShell() {
  return (
    <MobileCanvas>
      <main className="page app-content"><Outlet /></main>
      <BottomNav />
    </MobileCanvas>
  );
}
