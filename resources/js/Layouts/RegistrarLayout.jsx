import { useState, useRef, useEffect } from 'react';
import {
  House,
  Users,
  List,
  CaretDown,
  CaretRight,
  Clipboard,
  FileText,
  User,
  CalendarBlank,
  UserList,
  Printer,
  Notebook,
  CalendarCheck,
  GraduationCap,
  CheckCircle,
  UserGear,
  CaretLeft,
  Calendar,
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';
import { ClipboardList } from 'lucide-react';

export default function RegistrarLayout({ children }) {
  const { url } = usePage();
  const dropdownRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Store sidebar open/close in localStorage
  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      localStorage.setItem('sidebarOpen', JSON.stringify(!prev));
      return !prev;
    });
  };

  // Store active menu in localStorage
  const [menus, setMenus] = useState(() => {
    const stored = localStorage.getItem('activeMenus');
    if (stored) return JSON.parse(stored);
    return {
      enrollment: url.startsWith('/registrar/enrollment'),
      studentRecords: url.startsWith('/registrar/students') || url.startsWith('/registrar/enrollment/print'),
      reports: url.startsWith('/registrar/reports') || url.startsWith('/registrar/calendar'),
      curriculum: url.startsWith('/registrar/courses') || url.startsWith('/registrar/subjects') || url.startsWith('/registrar/curriculum'),
      academicYearSemester: url.startsWith('/registrar/academic-year') || url.startsWith('/registrar/semester'),
      departments: url.startsWith('/registrar/departments'),
    };
  });

  const toggleMenu = (name) => {
    setMenus(prev => {
      const newState = { ...prev, [name]: !prev[name] };
      localStorage.setItem('activeMenus', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
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
          didOpen: () => Swal.showLoading(),
        });
        localStorage.clear();
        sessionStorage.clear();
        router.post(route('logout'), { onFinish: () => Swal.close() });
      }
    });
  };

  return (
    <div className="flex min-h-screen font-[Poppins] bg-gray-50 text-[0.75rem]">
      {/* Sidebar */}
      <aside className={`bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 shadow-lg ${sidebarOpen ? 'w-56' : 'w-20'}`}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-7 h-7" />
            {sidebarOpen && <span className="text-xs font-semibold">Bukidnon State University Alubijid Campus</span>}
          </div>
        </div>

        <nav className="px-2 py-3 space-y-1">
          <NavItem href="/registrar/dashboard" icon={<House size={18} />} label="Dashboard" open={sidebarOpen} />

          <ExpandableMenu
            title="Enrollment"
            icon={<Clipboard size={18} />}
            open={sidebarOpen}
            isOpen={menus.enrollment}
            toggle={() => toggleMenu('enrollment')}
            items={[
              { href: '/registrar/pre-enroll', label: 'Pre-Enrolls', icon: <GraduationCap size={14} /> },
              { href: '/registrar/enrolled', label: 'Enrolled Students', icon: <CheckCircle size={14} /> },
              { href: "/registrar/enrollment-period", label: "Enrollment Period", icon: <Calendar size={14} /> },
              { href: '/registrar/enrollment/sections', label: 'Sections', icon: <Users size={14} /> },
              { href: '/registrar/students-list', label: 'Student List', icon: <UserList size={14} /> },
              { href: '/registrar/requirements', label: 'Requirements', icon: <FileText size={14} /> },
            ]}
          />
          <ExpandableMenu
            title="Grade Management"
            icon={<CheckCircle size={22} />}
            open={sidebarOpen}
            isOpen={menus.gradeManagement}
            toggle={() => toggleMenu('gradeManagement')}
            items={[
              { href: '/registrar/approved-grades', label: 'Approve Grades', icon: <CheckCircle size={18} /> },
              { href: '/registrar/grades', label: 'Review Submitted Grades', icon: <Notebook size={18} /> },
            ]}
          />

          <ExpandableMenu
            title="Student Records"
            icon={<UserList size={18} />}
            open={sidebarOpen}
            isOpen={menus.studentRecords}
            toggle={() => toggleMenu('studentRecords')}
            items={[
              { href: '/registrar/students-profile', label: 'Profile', icon: <User size={14} /> },
              { href: '/registrar/students-grades', label: 'Grades', icon: <Notebook size={14} /> },
              { href: '/registrar/enrollment/print', label: 'Enrollment Forms', icon: <Printer size={14} /> },
              { href: '/registrar/account', label: 'Student Account', icon: <UserGear size={14} /> },
              { href: '/registrar/submitted-requirements', label: 'Requirements', icon: <ClipboardList size={14} /> },
            ]}
          />

          <ExpandableMenu
            title="Reports"
            icon={<FileText size={18} />}
            open={sidebarOpen}
            isOpen={menus.reports}
            toggle={() => toggleMenu('reports')}
            items={[
              { href: '/registrar/enrollment-reports', label: 'Enrollment', icon: <Clipboard size={14} /> },
              { href: '/registrar/grade-reports', label: 'Grades', icon: <FileText size={14} /> },
              { href: '/registrar/calendar', label: 'Academic Calendar', icon: <CalendarBlank size={14} /> },
            ]}
          />  

          <NavItem href="/registrar/ay-semester" icon={<CalendarCheck size={18} />} label="A.Y & Semester" open={sidebarOpen} />

          <ExpandableMenu
            title="Curriculum"
            icon={<Notebook size={18} />}
            open={sidebarOpen}
            isOpen={menus.curriculum}
            toggle={() => toggleMenu('curriculum')}
            items={[
              { href: '/registrar/courses', label: 'Courses', icon: <Clipboard size={14} /> },
              { href: '/registrar/subjects', label: 'Subjects', icon: <FileText size={14} /> },
              { href: '/registrar/curriculum', label: 'Curriculum', icon: <Notebook size={14} /> },
            ]}
          />

          <ExpandableMenu
            title="Departments"
            icon={<Users size={18} />}
            open={sidebarOpen}
            isOpen={menus.departments}
            toggle={() => toggleMenu('departments')}
            items={[
              { href: '/registrar/department', label: 'Departments', icon: <Users size={14} /> },
              { href: '/registrar/program-heads', label: 'Program Heads', icon: <User size={14} /> },
            ]}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={toggleSidebar}
            className="bg-white p-2 rounded-lg shadow hover:bg-gray-100 transition"
          >
            {sidebarOpen ? <CaretLeft size={20} color="black" /> : <List size={20} color="black" />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow hover:bg-gray-100 transition text-[0.75rem]"
            >
              <User size={16} />
              {sidebarOpen && 'Registrar'}
              <CaretDown size={12} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-md text-sm overflow-hidden z-50">
                <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
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

// Nav item
function NavItem({ href, icon, label, open }) {
  const { url } = usePage();
  const isActive = url.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${isActive ? 'bg-blue-700 text-white font-semibold shadow-inner' : 'hover:bg-blue-700/80 text-white'
        }`}
    >
      {icon}
      {open && <span className="truncate">{label}</span>}
    </Link>
  );
}

// Expandable menu
function ExpandableMenu({ title, icon, open, isOpen, toggle, items }) {
  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-md transition ${isOpen ? 'bg-blue-700/80' : 'hover:bg-blue-700/60'
          } ${!open ? 'justify-center' : ''}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          {open && <span className="font-medium">{title}</span>}
        </div>
        {open && (isOpen ? <CaretDown size={12} /> : <CaretRight size={12} />)}
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
