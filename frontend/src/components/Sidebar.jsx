import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const Icon = ({ d }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const NAV = [
  {
    to: "/",
    label: "Overview",
    d: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0M12 7v5l3 3",
  },
  {
    to: "/practice",
    label: "Practice",
    d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 0 0-4-8",
  },
  {
    to: "/analyze",
    label: "Analyze",
    d: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  },
  {
    to: "/history",
    label: "History",
    d: "M12 3a9 9 0 1 0 9 9M12 7v5l4 2M21 3v5h-5",
  },
  {
    to: "/progress",
    label: "Progress",
    d: "M3 17l6-6 4 4 8-8M15 7h6v6",
  },
  {
    to: "/settings",
    label: "Settings",
    d: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1",
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/dashboards/learner")
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const weekly = Math.min(stats ? stats.completed : 0, 4);
  const pct = Math.round((weekly / 4) * 100);

  // Logout function
  const handleLogout = () => {
    logout();
    nav("/login");
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brandrow">
        <span className="brandlogo">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M3 12h3l2-5 4 10 3-8 2 3h4" />
          </svg>
        </span>

        <span className="brandword">rhetoric</span>
      </div>

      {/* Main Navigation */}
      <p className="sidekicker">Practice studio</p>

      <nav className="sidenav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) =>
              "sidenavitem" + (isActive ? " active" : "")
            }
          >
            <Icon d={n.d} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Workspace */}
      {["coach", "educator", "admin"].includes(user?.role) && (
        <>
          <p className="sidekicker">Workspace</p>

          <nav className="sidenav">
            {user.role !== "learner" && (
              <NavLink to="/coach" className="sidenavitem">
                <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0" />
                <span>Coach view</span>
              </NavLink>
            )}

            {["educator", "admin"].includes(user?.role) && (
              <NavLink to="/educator" className="sidenavitem">
                <Icon d="M22 10L12 5 2 10l10 5 10-5M6 12v5c3 3 9 3 12 0v-5" />
                <span>Class view</span>
              </NavLink>
            )}

            {user.role === "admin" && (
              <NavLink to="/admin" className="sidenavitem">
                <Icon d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>
        </>
      )}

      {/* Bottom Section */}
      <div className="sidebarfoot">
        {/* Weekly Practice Card */}
        <div className="weeklycard">
          <p className="sidekicker">Weekly practice</p>

          <p className="weeklytext">
            One more session keeps your momentum going.
          </p>

          <div className="weekbar">
            <div
              className="weekfill"
              style={{ width: pct + "%" }}
            />
          </div>

          <p className="weeklymeta">
            <span>{weekly} of 4 sessions</span>
            <span>{pct}%</span>
          </p>
        </div>

        {/* User Profile */}
        <div className="userrow">
          <span className="avatar">
            {(user?.full_name || user?.email || "U")[0].toUpperCase()}
          </span>

          <span className="usermeta">
            <b>{user?.full_name || user?.email}</b>

            <small>
              {user?.role === "learner"
                ? "Student learner"
                : user?.role}
            </small>
          </span>
        </div>

        {/* Logout Button */}
        <button
          className="logoutbtn"
          onClick={handleLogout}
          title="Logout"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}