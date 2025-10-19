import { Link } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import {
  House,
  Book,
  FileText,
  List,
  CaretDown,
  CaretLeft,
  User,
  CheckSquare,
} from "phosphor-react";
import "@fontsource/poppins";

const NAV_LINKS = [
  { href: "/students/dashboard", label: "Dashboard", Icon: House },
  { href: "/students/enrolled-subjects", label: "Enrolled Subjects", Icon: Book },
  { href: "/students/grades", label: "Grades", Icon: FileText },
  { href: "/students/academic-records", label: "Academic Records", Icon: CheckSquare },
];

export default function StudentLayout({ children }) {
  const dropdownRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-[#f6f7fb] font-[Poppins] lg:flex">
      {!isDesktop && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg transition hover:bg-blue-800"
          aria-label="Open sidebar"
        >
          <List size={18} />
        </button>
      )}

      {!isDesktop && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/35 backdrop-blur-sm"
          onClick={toggleSidebar}
          role="presentation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col bg-blue-900 text-white shadow-lg transition-transform duration-300 ease-in-out lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isDesktop ? (sidebarOpen ? "w-56" : "w-16") : "w-56"}`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="h-8 w-8" />
            {sidebarOpen && (
              <span className="text-xs font-semibold leading-tight tracking-tight">
                Bukidnon State University
                <br />
                Alubijid Campus
              </span>
            )}
          </div>
          {!isDesktop && sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              aria-label="Close sidebar"
            >
              <CaretLeft size={14} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-3 px-3 text-[11px]">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} open={sidebarOpen} />
          ))}
        </nav>

        {sidebarOpen && (
          <div className="hidden px-4 pb-4 text-[11px] text-white/70 lg:block">
            <span className="block font-semibold uppercase tracking-wide text-white">Need help?</span>
            <span>Registrar Office · (088) 555-1234</span>
          </div>
        )}
      </aside>

      <main
        className={`flex-1 px-4 py-5 transition-all duration-300 ease-in-out lg:px-6 ${
          isDesktop ? (sidebarOpen ? "lg:ml-56" : "lg:ml-16") : ""
        }`}
      >
        <div className="mb-4 flex items-center justify-end gap-2 lg:justify-between">
          <button
            onClick={toggleSidebar}
            className="hidden rounded-full bg-white px-2 py-1 text-sm text-blue-900 shadow transition hover:bg-blue-50 lg:inline-flex"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <span className="text-base font-semibold">&lt;</span> : <List size={18} />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs shadow-sm backdrop-blur-sm transition hover:bg-white/90"
            >
              <User size={18} />
              <CaretDown size={10} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-md border border-white/40 bg-white/90 text-xs shadow backdrop-blur">
                <Link
                  href="/profile"
                  className="block rounded-t-md px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="block w-full rounded-b-md px-3 py-1.5 text-left text-red-600 hover:bg-gray-100"
                >
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm transition-all duration-300 ease-in-out lg:p-5">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, label, Icon, open }) {
  const isActive = typeof window !== "undefined" && window.location.pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2 py-2 transition hover:bg-blue-800/60 ${
        isActive ? "bg-blue-800/80 font-semibold" : ""
      } ${open ? "justify-start" : "justify-center"}`}
    >
      <Icon size={open ? 18 : 20} />
      {open && <span className="text-[11px] tracking-tight">{label}</span>}
    </Link>
  );
}

