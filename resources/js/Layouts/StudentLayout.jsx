import { Link, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
  House,
  Book,
  FileText,
  Calendar,
  List,
  CaretDown,
  CaretRight,
  User,
  FileArrowDown,
  UsersThree,
  CheckSquare // replaced Ballot
} from 'phosphor-react';
import '@fontsource/poppins';

export default function StudentLayout({ children }) {
  const { auth } = usePage().props;
  const [openMenu, setOpenMenu] = useState({
    enrollment: false,
    grades: false,
    events: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    setOpenMenu((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-[Poppins]">
      {/* Sidebar */}
      <aside className={`bg-blue-900 text-white p-4 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} shadow-lg`}>
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-10 h-10" />
            {sidebarOpen && <span className="text-sm font-bold leading-tight">Bukidnon State University Alubijid Campus</span>}
          </div>
        </div>

        <nav className="space-y-3 text-sm">
          <NavItem href="/student/dashboard" icon={<House size={24} />} label="Dashboard" open={sidebarOpen} />

          <ExpandableMenu
            title="Enrollment"
            icon={<Book size={24} />}
            isOpen={openMenu.enrollment}
            toggle={() => toggleMenu('enrollment')}
            open={sidebarOpen}
            items={[
              { href: '/student/enroll', label: 'Enroll in Subjects', icon: <Book size={20} /> },
              { href: '/student/enrolled-subjects', label: 'My Enrolled Subjects', icon: <Book size={20} /> },
            ]}
          />

          <ExpandableMenu
            title="Grades"
            icon={<FileText size={24} />}
            isOpen={openMenu.grades}
            toggle={() => toggleMenu('grades')}
            open={sidebarOpen}
            items={[
              { href: '/student/grades/view', label: 'View Grades', icon: <FileText size={20} /> },
              { href: '/student/grades/report-card', label: 'Download Report Card', icon: <FileArrowDown size={20} /> },
            ]}
          />

          <NavItem href="/student/schedule" icon={<Calendar size={24} />} label="Schedule" open={sidebarOpen} />

          <ExpandableMenu
            title="Events & Election"
            icon={<UsersThree size={24} />}
            isOpen={openMenu.events}
            toggle={() => toggleMenu('events')}
            open={sidebarOpen}
            items={[
              { href: '/student/events', label: 'View Events', icon: <Calendar size={20} /> },
              { href: '/student/vote', label: 'Vote', icon: <CheckSquare size={20} /> }, // replaced Ballot
            ]}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white p-2 rounded shadow hover:bg-gray-100"
          >
            <List size={24} color="black" />
          </button>

          {/* Profile Dropdown */}
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
                <Link href="/logout" method="post" as="button" className="block w-full text-left px-3 py-1 text-red-600 hover:bg-gray-200 rounded-b">Logout</Link>
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
  const isActive = window.location.pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-2 rounded transition-all hover:bg-blue-700 ${
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
        className={`flex items-center justify-between w-full px-2 py-2 hover:bg-blue-700 rounded transition-all ${!open ? 'justify-center' : ''}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          {open && <span className="font-semibold">{title}</span>}
        </div>
        {open && <span>{isOpen ? <CaretDown size={20} /> : <CaretRight size={20} />}</span>}
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
