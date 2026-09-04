import {
  BookOpen,
  ClipboardCheck,
  MessagesSquare,
  AlertTriangle,
  Repeat2,
  Swords,
  Mic,
  Search,
  MessageCircleQuestion,
  BarChart3,
  Target,
  Users,
  Compass,
  FileDown,
  LayoutDashboard,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

export const ROLE_LABELS = {
  learner: "Learner",
  debate_coach: "Debate Coach",
  educator: "Educator",
  admin: "Admin",
};

// Identical link set and target routes as the pre-revamp sidebar
// (components/AppShell.jsx before Segment 28d) - only the
// presentation around this data changed.
export const NAV_SECTIONS = [
  {
    label: "Tools",
    links: [
      { to: "/case-review", label: "Full Case Review", icon: ClipboardCheck },
      { to: "/analyze", label: "Argument Analysis", icon: MessagesSquare },
      { to: "/fallacies", label: "Fallacy Detection", icon: AlertTriangle },
      { to: "/counterarguments", label: "Counterarguments", icon: Repeat2 },
      { to: "/debates", label: "Debate Simulation", icon: Swords },
      { to: "/presentation", label: "Presentation Analysis", icon: Mic },
      { to: "/research", label: "Debate Prep Research", icon: Search },
      { to: "/coaching-agent", label: "Ask Your AI Coach", icon: MessageCircleQuestion },
      { to: "/topics", label: "Topic Library", icon: BookOpen },
    ],
  },
  {
    label: "Progress",
    links: [
      { to: "/performance", label: "Performance Score", icon: BarChart3 },
      { to: "/goals", label: "Goals", icon: Target },
      { to: "/comparison", label: "Peer Comparison", icon: Users },
      { to: "/coaching", label: "Coaching Plan", icon: Compass },
      { to: "/reports", label: "Reports & Export", icon: FileDown },
    ],
  },
  {
    label: "Management",
    links: [
      {
        to: "/coach-dashboard",
        label: "Coach Dashboard",
        icon: LayoutDashboard,
        roles: ["debate_coach", "educator", "admin"],
      },
      {
        to: "/classes",
        label: "Classes",
        icon: GraduationCap,
        roles: ["debate_coach", "educator", "admin"],
      },
      {
        to: "/admin-dashboard",
        label: "Admin Dashboard",
        icon: ShieldCheck,
        roles: ["admin"],
      },
    ],
  },
];

/** Same role-filtering logic as the old sidebar's `visibleSections`. */
export function getVisibleSections(role) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => !link.roles || link.roles.includes(role)),
  })).filter((section) => section.links.length > 0);
}
