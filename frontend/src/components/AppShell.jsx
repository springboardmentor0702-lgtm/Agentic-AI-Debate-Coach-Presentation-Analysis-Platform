import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { supabase } from "../lib/supabaseClient";
import { getVisibleSections } from "./nav/navData";
import NavDropdown from "./nav/NavDropdown";
import ProfileMenu from "./nav/ProfileMenu";
import MobileMenu from "./nav/MobileMenu";
import SideNav from "./nav/SideNav";
import Footer from "./Footer";
import SettingsModal from "./SettingsModal";

function getStoredNavStyle() {
  if (typeof window === "undefined") return "top";
  const stored = localStorage.getItem("navStyle");
  return stored === "side" ? "side" : "top";
}

/**
 * Segment 28d: replaces the old fixed-height, independently-scrolling
 * sidebar shell with a sticky top nav + normal document scroll.
 *
 * Later addition: a user-chosen top-nav-vs-side-nav preference,
 * persisted the same way as the dark/light + accent color choice
 * (localStorage, device-local, defaults to the existing top nav so
 * nobody's experience changes unless they opt in). This only ever
 * swaps which chrome wraps <Outlet /> - no page's own logic or data
 * fetching is aware this setting exists. Below `md`, the layout is
 * identical either way (a fixed sidebar doesn't fit a phone screen),
 * so the mobile hamburger + MobileMenu render unconditionally.
 */
export default function AppShell() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null); // 'Tools' | 'Progress' | 'Management' | 'profile' | null
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navStyle, setNavStyleState] = useState(getStoredNavStyle);

  const setNavStyle = (style) => {
    setNavStyleState(style);
    localStorage.setItem("navStyle", style);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const visibleSections = getVisibleSections(profile?.role);
  const isSideNav = navStyle === "side";

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      {isSideNav ? (
        <SideNav
          profile={profile}
          unreadCount={unreadCount}
          visibleSections={visibleSections}
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <header className="hidden md:block sticky top-0 z-30 border-b border-glass-border bg-surface/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 min-w-0">
              <NavLink to="/dashboard" className="font-display text-lg tracking-tight shrink-0 mr-2">
                ClashLab
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
                    isActive ? "text-accent" : "text-ink hover:text-accent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Home size={15} />
                    <span className="hidden lg:inline">Dashboard</span>
                    {isActive && (
                      <span className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-accent rounded-full" />
                    )}
                  </>
                )}
              </NavLink>

              {visibleSections.map((section) => (
                <NavDropdown
                  key={section.label}
                  label={section.label}
                  links={section.links}
                  isOpen={openDropdown === section.label}
                  onOpen={() => setOpenDropdown(section.label)}
                  onToggle={() => setOpenDropdown((cur) => (cur === section.label ? null : section.label))}
                  onClose={() => setOpenDropdown((cur) => (cur === section.label ? null : cur))}
                />
              ))}
            </div>

            <ProfileMenu
              profile={profile}
              unreadCount={unreadCount}
              onLogout={handleLogout}
              isOpen={openDropdown === "profile"}
              onOpen={() => setOpenDropdown("profile")}
              onToggle={() => setOpenDropdown((cur) => (cur === "profile" ? null : "profile"))}
              onClose={() => setOpenDropdown((cur) => (cur === "profile" ? null : cur))}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </header>
      )}

      {/* Mobile top bar - unconditional regardless of navStyle, since a
          fixed sidebar has nowhere to go on a phone-width screen. */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-glass-border bg-surface/95 backdrop-blur-md">
        <NavLink to="/dashboard" className="font-display text-lg tracking-tight">
          ClashLab
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-ink"
        >
          <Menu size={22} />
        </button>
      </header>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        profile={profile}
        unreadCount={unreadCount}
        visibleSections={visibleSections}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className={`flex-1 px-5 sm:px-6 md:px-10 py-8 md:py-12 ${isSideNav ? "md:ml-72" : ""}`}>
        <div className="max-w-[1400px] mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/*
       * Footer lives outside <main> and after it as a sibling, with
       * <main> as the flex-1 item above it - that's what pins the
       * footer to the bottom of the viewport on short pages. The same
       * left offset as <main> keeps it aligned under the sidebar
       * instead of running full-width underneath it.
       */}
      <div className={`px-5 sm:px-6 md:px-10 ${isSideNav ? "md:ml-72" : ""}`}>
        <div className="max-w-[1400px] mx-auto w-full">
          <Footer variant="minimal" />
        </div>
      </div>

      {/*
       * Rendered exactly once, here, as a direct child of the
       * top-level shell - not inside SideNav/ProfileMenu/MobileMenu.
       * This matters for a real reason: backdrop-filter (used by the
       * `backdrop-blur-md` nav headers) creates a new CSS containing
       * block for any `position: fixed` descendant. A full-viewport
       * fixed overlay nested inside one of those headers would end up
       * positioned relative to the *header's own small box* instead
       * of the actual viewport - which is exactly what made the panel
       * render squashed into the top of the screen when it was
       * previously opened from inside the top nav's profile menu.
       * Mounting it here, as a sibling of every header rather than a
       * descendant of any of them, sidesteps that entirely.
       */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        navStyle={navStyle}
        onNavStyleChange={setNavStyle}
      />
    </div>
  );
}
