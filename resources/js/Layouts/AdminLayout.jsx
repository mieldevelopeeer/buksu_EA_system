import { useEffect, useRef, useState } from 'react';
import {
  House,
  BookOpen,
  UsersThree,
  List,
  CaretLeft,
  CaretDown,
  ClipboardText,
  FileText,
  CalendarCheck,
  ChartBar,
  User,
  Student,
  IdentificationBadge,
  ChalkboardTeacher,
  Timer,
  SignOut,
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';

export default function AdminLayout({ children }) {
  const { url, props } = usePage();
  const { auth } = props; 
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
          {/* <NavItem
            href="/admin/students"
            icon={<Student size={16} color="white" />}
            label="Students"
            open={sidebarOpen}
            currentUrl={url}
          /> */}

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
          {/* <NavItem
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
          /> */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto bg-slate-50 text-[11px] font-normal [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/60 [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center px-6 py-1.5">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <CaretLeft size={16} color="currentColor" />
              ) : (
                <List size={16} color="currentColor" />
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-gray-700 transition-all duration-200 hover:bg-gray-200 hover:border-gray-400"
              >
                <div className="flex items-center gap-2.5">
                  {props?.auth?.user?.profile_picture ? (
                    <img
                      src={props.auth.user.profile_picture}
                      alt="Profile"
                      className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex-shrink-0">
                      <User size={16} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">Administrator</p>
                    <p className="text-[10px] text-gray-600 font-medium truncate">{props?.auth?.user?.email || 'N/A'}</p>
                  </div>
                </div>
                <CaretDown size={12} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-lg border border-gray-300 bg-white shadow-lg overflow-hidden z-50">
                  {/* Actions */}
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-[12.5px] font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-b border-gray-200"
                  >
                    <User size={16} />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[12.5px] font-semibold text-gray-900 hover:text-red-600 hover:bg-red-50 transition-colors group"
                  >
                    <SignOut size={16} className="transition-colors group-hover:text-red-600" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="px-6 py-5">
          {children}
        </div>
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
