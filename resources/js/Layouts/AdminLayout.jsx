import { useEffect, useRef, useState } from 'react';
import {
  House,
  BookOpen,
  UsersThree,
  List,
  CaretLeft,
  UserCircle,
  ClipboardText,
  FileText,
  CalendarCheck,
  ChartBar,
  User,
  Student,
  IdentificationBadge,
  ChalkboardTeacher,
  Timer,
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';

export default function AdminLayout({ children }) {
  const { url } = usePage(); 
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const saved = window.localStorage.getItem('sidebarOpen');
      return saved === null ? false : JSON.parse(saved);
    } catch (error) {
      console.warn('Failed to read sidebarOpen from localStorage:', error);
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  function handleLogout() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Logging out...',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        localStorage.clear();
        sessionStorage.clear();

        router.post(route('logout'), {}, {
          onFinish: () => {
            Swal.close();
          },
        });
      }
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-[Poppins]">
      {/* Sidebar */}
      <aside
        className={`bg-blue-900 text-white p-4 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-2">
            <img
              src="/images/buksu_logo.png"
              alt="Logo"
              className="w-10 h-10"
            />
            {sidebarOpen && (
              <div>
                <span className="text-xs font-bold leading-tight">
                  Bukidnon State University
                  <br /> Alubijid Campus
                </span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <hr className="border-t border-white w-full mt-2 opacity-40" />
          )}
        </div>

        <nav className="space-y-2 text-xs">
          <NavItem
            href="/admin/dashboard"
            icon={<House size={20} color="white" />}
            label="Dashboard"
            open={sidebarOpen}
            currentUrl={url}
          />

          <SidebarLabel label="Academic Records" open={sidebarOpen} />
          <NavItem
            href="/admin/academic/students"
            icon={<Student size={16} color="white" />}
            label="Enrolled Students"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/academic/grades"
            icon={<FileText size={16} color="white" />}
            label="Grades"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/academic/requirements"
            icon={<ClipboardText size={16} color="white" />}
            label="Requirements"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/academic/submitted-requirements"
            icon={<FileText size={16} color="white" />}
            label="Submitted Requirements"
            open={sidebarOpen}
            currentUrl={url}
          />

          <SidebarLabel label="Academic Setup" open={sidebarOpen} />
          <NavItem
            href="/admin/academic-setup/class-schedules"
            icon={<CalendarCheck size={16} color="white" />}
            label="Class Schedules"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/curriculums"
            icon={<ClipboardText size={16} color="white" />}
            label="Curriculum"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/classrooms"
            icon={<ChalkboardTeacher size={16} color="white" />}
            label="Classrooms"
            open={sidebarOpen}
            currentUrl={url}
          />

          <SidebarLabel label="Departments & Programs" open={sidebarOpen} />
          <NavItem
            href="/admin/programs/departments"
            icon={<UsersThree size={16} color="white" />}
            label="Departments"
            open={sidebarOpen}
            currentUrl={url}
          />
     
          <NavItem
            href="/admin/programs/courses"
            icon={<BookOpen size={16} color="white" />}
            label="Courses & Majors"
            open={sidebarOpen}
            currentUrl={url}
          />

          <SidebarLabel label="Users" open={sidebarOpen} />
          <NavItem
            href="/admin/registrar"
            icon={<IdentificationBadge size={16} color="white" />}
            label="Registrar"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/program-head"
            icon={<ChalkboardTeacher size={16} color="white" />}
            label="Program Head"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/faculty"
            icon={<User size={16} color="white" />}
            label="Faculty"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/students"
            icon={<Student size={16} color="white" />}
            label="Students"
            open={sidebarOpen}
            currentUrl={url}
          />

          <SidebarLabel label="Reports" open={sidebarOpen} />
        
          <NavItem
            href="/admin/reports/enrollment-report"
            icon={<FileText size={16} color="white" />}
            label="Enrollment Report"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/reports/grade-report"
            icon={<FileText size={16} color="white" />}
            label="Grade Report"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/reports/faculty"
            icon={<User size={16} color="white" />}
            label="Faculty Load"
            open={sidebarOpen}
            currentUrl={url}
          />
          <NavItem
            href="/admin/reports/attendance"
            icon={<ClipboardText size={16} color="white" />}
            label="Attendance"
            open={sidebarOpen}
            currentUrl={url}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white p-2 rounded shadow hover:bg-gray-100 transition"
          >
            {sidebarOpen ? (
              <CaretLeft size={22} color="black" />
            ) : (
              <List size={22} color="black" />
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm hover:bg-white/90 transition"
            >
              <UserCircle size={18} />
              <span className="text-[10px] font-semibold">▼</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white/80 backdrop-blur-md rounded shadow text-xs z-50">
                <Link
                  href="/profile"
                  className="block px-3 py-1 text-gray-700 hover:bg-gray-200 rounded-t"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-1 text-red-600 hover:bg-gray-200 rounded-b"
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

function NavItem({ href, icon, label, open, currentUrl }) {
  const isActive = currentUrl.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-xs
        ${
          isActive
            ? 'bg-blue-600 text-white font-medium'
            : 'text-gray-300 hover:bg-blue-500 hover:text-white'
        }
      `}
    >
      {icon}
      {open && <span>{label}</span>}
    </Link>
  );
}

// 🔹 Section label helper
function SidebarLabel({ label, open }) {
  return (
    <div className={`flex items-center px-2 pt-4 text-[10px] uppercase tracking-wide text-blue-100 ${open ? '' : 'justify-center'}`}>
      {open && <span className="font-semibold text-[11px] text-blue-50">{label}</span>}
    </div>
  );
}
