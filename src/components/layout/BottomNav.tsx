import { NavLink } from "react-router-dom";

import { AppIcon, type AppIconName } from "../icons/AppIcon";

const items: { to: string; label: string; accessibleLabel?: string; icon: AppIconName }[] = [
  { to: "/", label: "首页", icon: "home" },
  { to: "/assessment", label: "体检", icon: "scan" },
  { to: "/agent", label: "问答", accessibleLabel: "AI", icon: "bot" },
  { to: "/me", label: "我的", icon: "user" }
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map((item) => (
        <NavLink className="nav-item" aria-label={item.accessibleLabel} key={item.to} to={item.to} end={item.to === "/"}>
          <AppIcon name={item.icon} size={21} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
