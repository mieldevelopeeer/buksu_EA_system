import { Link, usePage, router } from "@inertiajs/react";
import { useState, useRef, useEffect } from "react";
import {
  House,
  Clipboard,
  Users,
  FileText,
  NotePencil,
  Notebook,
  User,
  List,
  CaretLeft,
  AddressBook,
  BookOpen,
  Book,
  CheckCircle,
  CaretDown,
  ChartPie,
  Clock,
  GraduationCap,
} from "phosphor-react";

import "@fontsource/poppins/index.css";
import Swal from "sweetalert2";

export default function ProgramHeadLayout({ children }) {
  const { url, props } = usePage();
  const { auth } = props;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem("phSidebarOpen");
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem("phSidebarOpen", JSON.stringify(!prev));
      return !prev;
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, logout",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Logging out...",
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });
        localStorage.clear();
        sessionStorage.clear();
        router.post(route("logout"), { onFinish: () => Swal.close() });
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-[Poppins] text-[13px] font-normal">
      {/* Sidebar */}
      <aside
        className={`bg-blue-900 text-white transition-all duration-300 ${
          sidebarOpen ? "w-60" : "w-20"
        } shadow-lg relative`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-8 h-8" />
            {sidebarOpen && (
              <span className="text-[11px] font-medium leading-tight tracking-wide">
                Bukidnon State University
                <br />
                Alubijid Campus
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-2">
          <NavItem
            href="/program-head/dashboard"
            icon={<House size={20} />}
            label="Dashboard"
            open={sidebarOpen}
            url={url}
          />

          {sidebarOpen && (
            <p className="px-2 text-[11px] uppercase text-gray-300">Evaluation</p>
          )}
          <NavItem
            href="/program-head/enrollment"
            icon={<BookOpen size={18} />}
            label="Evaluate Enrollment"
            open={sidebarOpen}
            url={url}
          />
          <PendingNavItem
            href="/program-head/pending-enrollments"
            icon={<NotePencil size={18} />}
            label="Pending Pre-Enrolls"
            open={sidebarOpen}
            url={url}
            badge={props.pendingEnrollmentCount ?? 0}
          />
         

          {sidebarOpen && (
            <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-gray-300 mt-1.5">
              Student Data
            </p>
          )}
          <NavItem
            href="/program-head/students-list"
            icon={<Users size={18} />}
            label="Student List"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/academic-records"
            icon={<FileText size={18} />}
            label="Academic Records"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/students/enrolled"
            icon={<CheckCircle size={18} />}
            label="Enrolled Students"
            open={sidebarOpen}
            url={url}
          />

          {sidebarOpen && (
            <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-gray-300 mt-1.5">Faculty</p>
          )}
          <NavItem
            href="/program-head/faculties"
            icon={<Users size={18} />}
            label="Faculties"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/faculties/assignfaculty"
            icon={<AddressBook size={18} />}
            label="Assign Faculty"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/faculties/facultyload"
            icon={<Clipboard size={18} />}
            label="Faculty Load"
            open={sidebarOpen}
            url={url}
          />

          <div className="border-t border-blue-800 my-2" />

          <NavItem
            href="/program-head/section"
            icon={<Notebook size={20} />}
            label="Sections"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/curricula"
            icon={<Book size={20} />}
            label="Curriculum"
            open={sidebarOpen}
            url={url}
          />
          {sidebarOpen && (
            <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-gray-300 mt-1.5">
              Reports
            </p>
          )}
          <NavItem
            href="/program-head/reports/enrollment"
            icon={<ChartPie size={18} />}
            label="Enrollment Report"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/reports/grades"
            icon={<GraduationCap size={18} />}
            label="Grades Report"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/reports/attendance"
            icon={<Clock size={18} />}
            label="Attendance Report"
            open={sidebarOpen}
            url={url}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 text-[13px] font-normal">
        <div className="flex justify-between items-center mb-4">
          {/* Sidebar Toggle */}
          <button
            onClick={toggleSidebar}
            className="bg-white p-2 rounded shadow hover:bg-gray-100 transition"
          >
            {sidebarOpen ? (
              <CaretLeft size={20} color="black" />
            ) : (
              <List size={20} color="black" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-md shadow hover:bg-gray-100 transition text-[13px] font-normal"
            >
              <User size={18} />
              {sidebarOpen && (
                <>
                  <span>Program Head</span>
                  <CaretDown size={14} />
                </>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow-md z-50 text-sm overflow-hidden">
                <Link
                  href="/profile"
                  className="block px-3 py-2 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

function PendingNavItem({ href, icon, label, open, url, badge = 0 }) {
  const isActive = url.startsWith(href);
  const hasBadge = Number(badge) > 0;

  return (
    <div className="relative group text-[13px] font-normal">
      <Link
        href={href}
        className={`flex items-center gap-2 p-2 rounded-md transition ${
          isActive
            ? "bg-blue-800 text-white font-medium shadow-inner"
            : "hover:bg-blue-700 hover:text-white text-gray-200"
        }`}
      >
        <span className="relative">
          {icon}
          {!open && hasBadge && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-semibold text-white">
              {badge}
            </span>
          )}
        </span>
        {open && (
          <span className="flex items-center gap-2">
            {label}
            {hasBadge && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {badge}
              </span>
            )}
          </span>
        )}
      </Link>
      {!open && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-blue-800 text-white px-2 py-0.5 rounded text-[11px] opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      )}
    </div>
  );
}

function NavItem({ href, icon, label, open, url }) {
  const isActive = url.startsWith(href);

  return (
    <div className="relative group text-[13px] font-normal">
      <Link
        href={href}
        className={`flex items-center gap-2 p-2 rounded-md transition ${
          isActive
            ? "bg-blue-800 text-white font-medium shadow-inner"
            : "hover:bg-blue-700 hover:text-white text-gray-200"
        }`}
      >
        <span className="relative">{icon}</span>
        {open && <span>{label}</span>}
      </Link>
      {!open && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-blue-800 text-white px-2 py-0.5 rounded text-[11px] opacity-0 group-hover:opacity-100 transition">
          {label}
        </span>
      )}
    </div>
  );
}
