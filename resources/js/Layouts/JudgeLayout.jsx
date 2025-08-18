import { Link, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import {
  House,
  Users,
  ClipboardText,
  SpeakerHigh,
  List,
  CaretDown,
  User
} from 'phosphor-react';
import '@fontsource/poppins';

export default function JudgeLayout({ children }) {
  const { auth } = usePage().props;
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

  return (
    <div className="min-h-screen flex bg-gray-100 font-[Poppins]">
      {/* Sidebar */}
      <aside className={`bg-blue-900 text-white p-4 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} shadow-lg`}>
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-10 h-10" />
            {sidebarOpen && <span className="text-sm font-bold leading-tight">Bukidnon State University Alubijid Campus </span>}
          </div>
        </div>

        <nav className="space-y-3 text-sm">
          <NavItem href="/judge/dashboard" icon={<House size={24} />} label="Dashboard" open={sidebarOpen} />
          <NavItem href="/judge/contestants" icon={<Users size={24} />} label="View Contestants" open={sidebarOpen} />
          <NavItem href="/judge/judging" icon={<ClipboardText size={24} />} label="Judging" open={sidebarOpen} />
          <NavItem href="/judge/announcement" icon={<SpeakerHigh size={24} />} label="Announcement of Winners" open={sidebarOpen} />
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
