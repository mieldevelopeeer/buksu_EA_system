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
  Calendar,    // added icon for semesters
  CalendarCheck, // icon for school year
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';

export default function RegistrarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { url } = usePage();

  const [menus, setMenus] = useState({
    enrollment: url.startsWith('/registrar/enrollment'),
    studentRecords: url.startsWith('/registrar/students') || url.startsWith('/registrar/enrollment/print'),
    reports: url.startsWith('/registrar/reports') || url.startsWith('/registrar/calendar'),
    curriculum: url.startsWith('/registrar/courses') || url.startsWith('/registrar/subjects') || url.startsWith('/registrar/curriculum'),
    departments: url.startsWith('/registrar/departments'),
  });

  const toggleMenu = (name) => {
    setMenus((prev) => ({ ...prev, [name]: !prev[name] }));
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

        router.post(route('logout'), {
          onFinish: () => Swal.close(),
        });
      }
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-[Poppins]">
      {/* Sidebar */}
      <aside className={`bg-blue-900 text-white p-4 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-10 h-10" />
            {sidebarOpen && <span className="text-sm font-bold leading-tight">Bukidnon State University Alubijid Campus</span>}
          </div>
        </div>

        <nav className="space-y-3 text-sm">
          <NavItem href="/registrar/dashboard" icon={<House size={24} />} label="Dashboard" open={sidebarOpen} />

          <ExpandableMenu
            title="Enrollment"
            icon={<Clipboard size={24} />}
            open={sidebarOpen}
            isOpen={menus.enrollment}
            toggle={() => toggleMenu('enrollment')}
            items={[
              { href: '/registrar/enrollment/manage', label: 'Enrollment', icon: <Clipboard size={20} /> },
              { href: '/registrar/enrollment/sections', label: 'Sections', icon: <Users size={20} /> },
              { href: '/registrar/enrollment/students', label: 'Student List', icon: <UserList size={20} /> },
              { href: '/registrar/enrollment/requirements', label: 'Requirements', icon: <FileText size={20} /> },
            ]}
          />

          <ExpandableMenu
            title="Student Records"
            icon={<UserList size={24} />}
            open={sidebarOpen}
            isOpen={menus.studentRecords}
            toggle={() => toggleMenu('studentRecords')}
            items={[
              { href: '/registrar/students/profile', label: 'Student Profile', icon: <User size={20} /> },
              { href: '/registrar/students/grades', label: 'Grades', icon: <Notebook size={20} /> },
              { href: '/registrar/enrollment/print', label: 'Enrollment Forms', icon: <Printer size={20} /> },
            ]}
          />

          <ExpandableMenu
            title="Reports"
            icon={<FileText size={24} />}
            open={sidebarOpen}
            isOpen={menus.reports}
            toggle={() => toggleMenu('reports')}
            items={[
              { href: '/registrar/reports/enrollment', label: 'Enrollment', icon: <Clipboard size={20} /> },
              { href: '/registrar/reports/grades', label: 'Grades', icon: <FileText size={20} /> },
              { href: '/registrar/calendar', label: 'Academic Calendar', icon: <CalendarBlank size={20} /> },
            ]}
          />


          <ExpandableMenu
            title="S.Y & Semester"
            icon={<CalendarCheck size={24} />}
            open={sidebarOpen}
            isOpen={menus.academicYearSemester}
            toggle={() => toggleMenu('academicYearSemester')}
            items={[
              { href: '/registrar/academic-year', label: 'Academic Year', icon: <CalendarCheck size={20} /> },
              { href: '/registrar/semester', label: 'Semester', icon: <CalendarBlank size={20} /> },
            ]}
          />



          <ExpandableMenu
            title="Curriculum"
            icon={<Notebook size={24} />}
            open={sidebarOpen}
            isOpen={menus.curriculum}
            toggle={() => toggleMenu('curriculum')}
            items={[
              { href: '/registrar/courses', label: 'Courses', icon: <Clipboard size={20} /> },
              { href: '/registrar/subjects', label: 'Subjects', icon: <FileText size={20} /> },
              { href: '/registrar/curriculum', label: 'Curriculum', icon: <Notebook size={20} /> },
            ]}
          />

          <ExpandableMenu
            title="Departments"
            icon={<Users size={24} />}
            open={sidebarOpen}
            isOpen={menus.departments}
            toggle={() => toggleMenu('departments')}
            items={[
              { href: '/registrar/department', label: 'Departments', icon: <Users size={20} /> },
              { href: '/registrar/departments/assign-heads', label: 'Program Heads', icon: <User size={20} /> },
              { href: '/registrar/departments/list', label: 'Department List', icon: <List size={20} /> },
            ]}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-white p-2 rounded shadow hover:bg-gray-100">
            <List size={24} color="black" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm hover:bg-white/90 transition"
            >
              <User size={20} />
              <CaretDown size={12} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white/80 backdrop-blur-md rounded shadow text-sm z-50">
                <Link href="/profile" className="block px-3 py-1 text-gray-700 hover:bg-gray-200 rounded-t">Profile</Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-1 text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-b"
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

function NavItem({ href, icon, label, open }) {
  const { url } = usePage();
  const isActive = url.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-2 rounded transition-all ${isActive ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'
        }`}
    >
      {icon}
      {open && <span>{label}</span>}
    </Link>
  );
}

function ExpandableMenu({ title, icon, open, isOpen, toggle, items }) {
  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center justify-between w-full px-2 py-2 hover:bg-blue-700 rounded transition-all ${!open ? 'justify-center' : ''}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          {open && <span className="font-semibold">{title}</span>}
        </div>
        {open && (
          <span>{isOpen ? <CaretDown size={20} /> : <CaretRight size={20} />}</span>
        )}
      </button>
      {isOpen && open && (
        <div className="ml-6 mt-1 space-y-1">
          {items.map((item, i) => (
            <NavItem key={i} href={item.href} icon={item.icon} label={item.label} open={open} />
          ))}
        </div>
      )}
    </div>
  );
}
