import { Link, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
  House,
  Clipboard,
  Users,
  FileText,
  CaretDown,
  CaretRight,
  CaretLeft,
  Notebook,
  User,
  List,
  Calendar,
  BookOpen,
  FileArrowUp,
  FileSearch,
  NotePencil,
  File,
} from 'phosphor-react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';

export default function FacultyLayout({ children }) {
  const { auth, enrolledStudents = [] } = usePage().props;

  // Sidebar state
  const savedSidebar = localStorage.getItem('sidebarOpen') === 'true';
  const [sidebarOpen, setSidebarOpen] = useState(savedSidebar);

  // Menu state
  const savedMenu = JSON.parse(localStorage.getItem('openMenu')) || {
    classes: false,
    grades: false,
  };
  const [openMenu, setOpenMenu] = useState(savedMenu);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Persist sidebar open/close
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen);
  }, [sidebarOpen]);

  // Persist open menus
  useEffect(() => {
    localStorage.setItem('openMenu', JSON.stringify(openMenu));
  }, [openMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu) => {
    setOpenMenu((prev) => {
      const newState = { ...prev, [menu]: !prev[menu] };
      return newState;
    });
  };

  const groupedStudents = Object.values(
    enrolledStudents.reduce((groups, entry) => {
      const subjectKey = entry.subject?.id ?? 'unknown';
      if (!groups[subjectKey]) {
        groups[subjectKey] = {
          subjectName: entry.subject?.name ?? 'Unassigned Subject',
          subjectCode: entry.subject?.code ?? '',
          students: [],
        };
      }
      groups[subjectKey].students.push(entry);
      return groups;
    }, {})
  );

  return (
    <div className="min-h-screen flex bg-gray-100 font-[Poppins]">
      {/* Sidebar */}
      <aside
        className={`bg-blue-900 text-white p-3 transition-all duration-300 ${
          sidebarOpen ? 'w-52' : 'w-16'
        } shadow-lg`}
      >
        <div className="mb-6 flex items-center space-x-2">
          <img src="/images/buksu_logo.png" alt="Logo" className="w-8 h-8" />
          {sidebarOpen && (
            <span className="text-xs font-bold leading-tight">
              Bukidnon State University Alubijid Campus
            </span>
          )}
        </div>

        <nav className="space-y-2 text-xs">
          <NavItem
            href="/faculty/dashboard"
            icon={<House size={20} />}
            label="Dashboard"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/classes"
            icon={<Notebook size={20} />}
            label="My Classes"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/students-list"
            icon={<Users size={20} />}
            label="Students Lists"
            open={sidebarOpen}
          />

           <NavItem
            href="/faculty/grades"
            icon={<Clipboard size={20} />}
            label="Grades"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/attendance"
            icon={<Calendar size={20} />}
            label="Attendance"
            open={sidebarOpen}
          />

          {/* {sidebarOpen && (
            <p className="px-2 text-[10px] uppercase tracking-[0.22em] text-gray-300 mt-1.5">
              Reports
            </p>
          )}

          <NavItem
            href="/faculty/reports/attendance"
            icon={<Calendar size={20} />}
            label="Attendance Reports"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/reports/gradereport"
            icon={<Clipboard size={20} />}
            label="Grade Reports"
            open={sidebarOpen}
          /> */}

         
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="flex justify-between items-center mb-3">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white p-2 rounded shadow hover:bg-gray-100 transition"
          >
            {sidebarOpen ? <CaretLeft size={20} color="black" /> : <List size={20} color="black" />}
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm hover:bg-white/90 transition ${
                !sidebarOpen ? 'w-8 justify-center' : 'w-auto'
              }`}
            >
              <User size={18} />
              {sidebarOpen && <CaretDown size={12} />}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-28 bg-white/80 backdrop-blur-md rounded shadow text-xs z-50">
                <Link href="/profile" className="block px-3 py-1 text-gray-700 hover:bg-gray-200 rounded-t">
                  Profile
                </Link>
                <Link
                  href="/logout"
                  method="post"
                  as="button"
                  className="block w-full text-left px-3 py-1 text-red-600 hover:bg-gray-200 rounded-b"
                >
                  Logout
                </Link>
              </div>
            )}
          </div>
        </div>

        {groupedStudents.length > 0 && (
          <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Teaching Load</p>
                <h2 className="text-sm font-semibold text-slate-800">Enrolled Students</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600">
                {enrolledStudents.length} total
              </span>
            </header>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groupedStudents.map((group) => (
                <div key={group.subjectCode || group.subjectName} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Subject</p>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {group.subjectName}
                      {group.subjectCode && (
                        <span className="ml-2 text-[11px] font-medium text-slate-500">{group.subjectCode}</span>
                      )}
                    </h3>
                  </div>
                  <ul className="space-y-1">
                    {group.students.map((student) => (
                      <li key={`${group.subjectCode}-${student.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                        <span className="font-medium text-slate-700">{student.name}</span>
                        {student.section && <span className="text-[11px] text-slate-500">{student.section}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, open }) {
  const isActive = window.location.pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 p-2 rounded transition-all hover:bg-blue-700 ${
        isActive ? 'bg-blue-800 font-semibold' : ''
      }`}
    >
      {icon}
      {open && <span>{label}</span>}
    </Link>
  );
}

function ExpandableMenu({ title, icon, isOpen, toggle, items, open }) {
  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center justify-between w-full px-2 py-2 hover:bg-blue-700 rounded transition-all ${
          !open ? 'justify-center' : ''
        }`}
      >
        <div className="flex items-center gap-1">
          {icon}
          {open && <span className="font-semibold">{title}</span>}
        </div>
        {open && <span>{isOpen ? <CaretDown size={16} /> : <CaretRight size={16} />}</span>}
      </button>
      {isOpen && open && (
        <div className="ml-5 mt-1 space-y-1">
          {items.map((item, i) => (
            <NavItem key={i} href={item.href} icon={item.icon} label={item.label} open={open} />
          ))}
        </div>
      )}
    </div>
  );
}
