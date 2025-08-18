import { useEffect, useRef, useState } from 'react';
import {
  House,
  BookOpen,
  UsersThree,
  List,
  CaretDown,
  CaretRight,
  UserCircle,
  ClipboardText,
  GraduationCap,
  FileText,
  CalendarCheck,
  ChartBar,
  User,
  Student,
  AddressBook,
  Book,
  CheckCircle,
  Timer,
  Calendar,
  NotePencil,
  IdentificationBadge,
  ChalkboardTeacher,
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';

export default function AdminLayout({ children }) {
  const { url } = usePage(); // 👈 Get current route
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved === null ? false : JSON.parse(saved);
  });

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [menus, setMenus] = useState({
    enrollment: false,
    curriculum: false,
    academic: false,
    users: false,
    grades: false,
    reports: false,
    events: false,
  });

 const toggleMenu = (name) => {
    setMenus((prevMenus) => {
      return {
        ...prevMenus,
        [name]: !prevMenus[name],
      };
    });
  };

  useEffect(() => {
    const matchedMenus = {
      enrollment: [
        '/admin/records',
        '/admin/periods',
        '/admin/manage',
        '/admin/sections',
      ],
      curriculum: ['/admin/curriculum'],
      academic: ['/admin/programs', '/admin/semesters', '/admin/schedule'],
      users: [
        '/admin/users',
        '/admin/program_head',
        '/admin/faculty',
        '/admin/students',
      ],
      grades: ['/admin/grades'],
      reports: ['/admin/reports'],
      events: ['/admin/events', '/admin/elections'],
    };

    const newState = {};

    for (const [menu, paths] of Object.entries(matchedMenus)) {
      newState[menu] = paths.some((path) => url.startsWith(path));
    }

    setMenus((prev) => ({ ...prev, ...newState }));
  }, [url]);


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
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center space-x-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-12 h-12" />
            {sidebarOpen && (
              <div>
                <span className="text-sm font-bold leading-tight">
                  Bukidnon State University<br />Alubijid Campus
                </span>
              </div>
            )}
          </div>
          {sidebarOpen && <hr className="border-t border-white w-full mt-2" />}
        </div>


        <nav className="space-y-3 text-sm">
          <NavItem href="/admin/dashboard" icon={<House size={24} color="white" />} label="Dashboard" open={sidebarOpen} currentUrl={url} />

          <ExpandableMenu
            title="Enrollment"
            icon={<BookOpen size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.enrollment}
            toggle={() => toggleMenu('enrollment')}
            items={[
              { href: '/admin/records', label: 'Enrollment Records', icon: <FileText size={20} color="white" /> },
              { href: '/admin/periods', label: 'Enrollment Periods', icon: <Calendar size={20} color="white" /> },
              { href: '/admin/manage', label: 'Enroll/Drop Students', icon: <User size={20} color="white" /> },
              { href: '/admin/sections', label: 'Sections', icon: <AddressBook size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Curriculum"
            icon={<ClipboardText size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.curriculum}
            toggle={() => toggleMenu('curriculum')}
            items={[
              { href: '/admin/curriculum/manage', label: 'Manage Curriculum', icon: <Book size={20} color="white" /> },
              { href: '/admin/curriculum/subjects', label: 'Courses / Subjects', icon: <NotePencil size={20} color="white" /> },
              { href: '/admin/curriculum/prerequisites', label: 'Prerequisites & Units', icon: <CheckCircle size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Academic Setup"
            icon={<GraduationCap size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.academic}
            toggle={() => toggleMenu('academic')}
            items={[
              { href: '/admin/programs', label: 'Programs & Departments', icon: <BookOpen size={20} color="white" /> },
              { href: '/admin/semesters', label: 'Semesters', icon: <Timer size={20} color="white" /> },
              { href: '/admin/schedule', label: 'Scheduling', icon: <CalendarCheck size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Users"
            icon={<UsersThree size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.users}
            toggle={() => toggleMenu('users')}
            items={[
              { href: '/admin/registrar', label: 'Registrar', icon: <IdentificationBadge size={20} color="white" /> },
              { href: '/admin/program-head', label: 'ProgramHead', icon: <ChalkboardTeacher size={20} color="white" /> },
              { href: '/admin/faculty', label: 'Faculty', icon: <User size={20} color="white" /> },
              { href: '/admin/students', label: 'Students', icon: <Student size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Grades"
            icon={<FileText size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.grades}
            toggle={() => toggleMenu('grades')}
            items={[
              { href: '/admin/grades/period', label: 'Grade Periods', icon: <Calendar size={20} color="white" /> },
              { href: '/admin/grades/view', label: 'View Grades', icon: <FileText size={20} color="white" /> },
              { href: '/admin/grades/report', label: 'Report Cards', icon: <ChartBar size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Reports"
            icon={<ChartBar size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.reports}
            toggle={() => toggleMenu('reports')}
            items={[
              { href: '/admin/reports/enrollment', label: 'Enrollment Report', icon: <CalendarCheck size={20} color="white" /> },
              { href: '/admin/reports/grades', label: 'Grades Report', icon: <FileText size={20} color="white" /> },
              { href: '/admin/reports/faculty', label: 'Faculty Load', icon: <User size={20} color="white" /> },
              { href: '/admin/reports/attendance', label: 'Attendance', icon: <ClipboardText size={20} color="white" /> },
              { href: '/admin/reports/curriculum', label: 'Curriculum Summary', icon: <Book size={20} color="white" /> },
            ]}
            currentUrl={url}
          />

          <ExpandableMenu
            title="Events & Elections"
            icon={<CalendarCheck size={24} color="white" />}
            open={sidebarOpen}
            isOpen={menus.events}
            toggle={() => toggleMenu('events')}
            items={[
              { href: '/admin/events/manage', label: 'Manage Events', icon: <Calendar size={20} color="white" /> },
              { href: '/admin/events/judges', label: 'Judges & Criteria', icon: <UsersThree size={20} color="white" /> },
              { href: '/admin/elections', label: 'Elections', icon: <CheckCircle size={20} color="white" /> },
            ]}
            currentUrl={url}
          />
        </nav>
      </aside>

      {/* Main content */}
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
              <UserCircle size={20} />
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

// Highlight active tab
function NavItem({ href, icon, label, open, currentUrl }) {
  const isActive = currentUrl.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-2 rounded transition-all
        ${isActive ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}
      `}
    >
      {icon}
      {open && <span>{label}</span>}
    </Link>
  );
}

function ExpandableMenu({ title, icon, open, isOpen, toggle, items, currentUrl }) {
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
        {open && <span>{isOpen ? <CaretDown size={20} color="white" /> : <CaretRight size={20} color="white" />}</span>}
      </button>
      {isOpen && open && (
        <div className="ml-6 mt-1 space-y-1">
          {items.map((item, i) => (
            <NavItem key={i} href={item.href} icon={item.icon} label={item.label} open={open} currentUrl={currentUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
