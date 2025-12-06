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
  BellSimple,
  SignOut,
} from 'phosphor-react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import '@fontsource/poppins/index.css';
import Swal from 'sweetalert2';
import { ClipboardList } from 'lucide-react';

const NOTIF_POLL_INTERVAL = 15000; // 15 seconds

export default function RegistrarLayout({ children }) {
  const { url, props } = usePage();
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(props?.notifications ?? []);
  const [isNotifLoading, setNotifLoading] = useState(false);
  const seenNotificationIdsRef = useRef(new Set((props?.notifications ?? []).map((item) => item.id)));

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

      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((entry) => !entry.is_read).length;

  const resolveNotificationUrl = (rawUrl) => {
    if (!rawUrl) {
      return null;
    }

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const relativePath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return relativePath || '/';
    } catch (error) {
      // Fallback to raw string if URL constructor fails
      return rawUrl;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await axios.post(route('notifications.read', notificationId));
      setNotifications((prev = []) =>
        prev.map((entry) => (entry.id === notificationId ? { ...entry, is_read: true } : entry))
      );
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const showNotificationNavigationError = (status) => {
    const isMissing = status === 404;
    Swal.fire({
      toast: true,
      position: 'top-end',
      timer: 2500,
      showConfirmButton: false,
      width: 260,
      padding: '0.6rem 0.85rem',
      customClass: {
        popup: 'text-[13px] leading-tight',
        title: 'text-[13px] font-semibold',
        htmlContainer: 'text-[12px] text-slate-600',
      },
      icon: isMissing ? 'info' : 'error',
      title: isMissing ? 'Page unavailable' : 'Unable to open notification',
      text: isMissing
        ? 'Linked page no longer exists or belongs to an inactive semester.'
        : 'Please refresh and try again.',
    });
  };

  const openNotification = async (notification, navigate = false) => {
    if (!notification) return;

    try {
      await markNotificationAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }

    if (navigate && notification.url) {
      const target = resolveNotificationUrl(notification.url);
      if (!target) {
        showNotificationNavigationError(404);
        return;
      }

      try {
        await axios.head(target, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        router.visit(target, { preserveScroll: true });
        setNotifOpen(false);
      } catch (error) {
        const status = error?.response?.status;
        showNotificationNavigationError(status);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const fetchNotifications = async () => {
      try {
        setNotifLoading(true);
        const response = await axios.get(route('notifications.feed'));
        if (isMounted) {
          setNotifications(response.data?.data ?? []);
        }
      } catch (error) {
        console.error('Failed to load notifications', error);
      } finally {
        if (isMounted) {
          setNotifLoading(false);
        }
      }
    };

    fetchNotifications();
    timerId = setInterval(fetchNotifications, NOTIF_POLL_INTERVAL);

    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
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
    <div className="min-h-screen flex bg-gray-100 font-[Poppins] text-[11px] font-normal">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-blue-950 to-blue-900 text-white transition-all duration-300 ${
          sidebarOpen ? "w-56" : "w-20"
        } shadow-2xl relative h-screen sticky top-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-blue-800/50 bg-blue-950/50">
          <div className="flex items-center gap-3">
            <img src="/images/buksu_logo.png" alt="Logo" className="w-8 h-8 flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-[10.5px] font-bold leading-tight tracking-wider text-white">
                Bukidnon State
                <br />
                University
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5 text-[11px]">
          {/* Dashboard */}
          <NavItem href="/registrar/dashboard" icon={<House size={18} />} label="Dashboard" open={sidebarOpen} url={url} />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Enrollment Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Enrollment
            </p>
          )}
          <ExpandableMenu
            title="Enrollment"
            icon={<Clipboard size={18} />}
            open={sidebarOpen}
            isOpen={menus.enrollment}
            toggle={() => toggleMenu('enrollment')}
            url={url}
            items={[
              // { href: '/registrar/pre-enroll', label: 'Pre-Enrolls', icon: <GraduationCap size={14} /> },
              { href: '/registrar/enrolled', label: 'Enrolled Students', icon: <CheckCircle size={14} /> },
              { href: "/registrar/enrollment-period", label: "Enrollment Period", icon: <Calendar size={14} /> },
              { href: '/registrar/students-list', label: 'Student List', icon: <UserList size={14} /> },
              { href: '/registrar/requirements', label: 'Requirements', icon: <FileText size={14} /> },
            ]}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Grade Management Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Grade Management
            </p>
          )}
          <ExpandableMenu
            title="Grade Management"
            icon={<CheckCircle size={18} />}
            open={sidebarOpen}
            isOpen={menus.gradeManagement}
            toggle={() => toggleMenu('gradeManagement')}
            url={url}
            items={[
              { href: '/registrar/grades', label: 'Review Submitted Grades', icon: <Notebook size={18} /> },
            ]}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Student Records Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Student Records
            </p>
          )}
          <ExpandableMenu
            title="Student Records"
            icon={<UserList size={18} />}
            open={sidebarOpen}
            isOpen={menus.studentRecords}
            toggle={() => toggleMenu('studentRecords')}
            url={url}
            items={[
              { href: '/registrar/students-profile', label: 'Profile', icon: <User size={14} /> },
              { href: '/registrar/account', label: 'Student Account', icon: <UserGear size={14} /> },
            ]}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Reports Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Reports
            </p>
          )}
          <ExpandableMenu
            title="Reports"
            icon={<FileText size={18} />}
            open={sidebarOpen}
            isOpen={menus.reports}
            toggle={() => toggleMenu('reports')}
            url={url}
            items={[
              { href: '/registrar/enrollment-reports', label: 'Enrollment', icon: <Clipboard size={14} /> },
              { href: '/registrar/grade-reports', label: 'Grades', icon: <FileText size={14} /> },
            ]}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Academic Setup Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Academic Setup
            </p>
          )}
          <NavItem href="/registrar/ay-semester" icon={<CalendarCheck size={18} />} label="A.Y & Semester" open={sidebarOpen} url={url} />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Curriculum Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Curriculum
            </p>
          )}
          <ExpandableMenu
            title="Curriculum"
            icon={<Notebook size={18} />}
            open={sidebarOpen}
            isOpen={menus.curriculum}
            toggle={() => toggleMenu('curriculum')}
            url={url}
            items={[
              { href: '/registrar/courses', label: 'Courses', icon: <Clipboard size={14} /> },
              { href: '/registrar/subjects', label: 'Subjects', icon: <FileText size={14} /> },
              { href: '/registrar/curriculum', label: 'Curriculum', icon: <Notebook size={14} /> },
            ]}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Departments Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Organization
            </p>
          )}
          <ExpandableMenu
            title="Departments"
            icon={<Users size={18} />}
            open={sidebarOpen}
            isOpen={menus.departments}
            toggle={() => toggleMenu('departments')}
            url={url}
            items={[
              { href: '/registrar/department', label: 'Departments', icon: <Users size={14} /> },
              { href: '/registrar/program-heads', label: 'Program Heads', icon: <User size={14} /> },
            ]}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen overflow-y-auto bg-slate-50 text-[11px] font-normal [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/60 [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center px-6 py-2.5">
            {/* Sidebar Toggle */}
            <button
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              title="Toggle sidebar"
            >
              {sidebarOpen ? (
                <CaretLeft size={16} color="currentColor" />
              ) : (
                <List size={16} color="currentColor" />
              )}
            </button>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setDropdownOpen(false);
                  }}
                  className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <BellSimple
                    size={16}
                    className={`transition-colors ${isNotifLoading ? 'animate-notif-wiggle text-sky-500' : ''}`}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white shadow-md">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[13px] font-black text-slate-950">Notifications</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11.5px] font-semibold text-slate-700">Unread: <span className="font-bold text-slate-900">{unreadCount}</span></span>
                        <Link
                          href={route('notifications.index')}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">
                      {notifications.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400">
                          No notifications yet.
                        </p>
                      )}
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openNotification(item, Boolean(item.url))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openNotification(item, Boolean(item.url));
                            }
                          }}
                          className={`cursor-pointer rounded-xl border px-3 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                            item.is_read ? 'border-slate-100 bg-slate-50' : 'border-blue-100 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11.5px] font-bold text-slate-900 flex-1">{item.title}</p>
                            {item.type && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate-700 flex-shrink-0">
                                {item.type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10.5px] text-slate-700 line-clamp-2 font-medium">{item.message}</p>
                          {item.created_at && (
                            <p className="mt-1.5 text-[9px] text-slate-500">
                              {(() => {
                                try {
                                  return new Date(item.created_at).toLocaleString();
                                } catch (error) {
                                  return item.created_at;
                                }
                              })()}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                markNotificationAsRead(item.id);
                              }}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                              disabled={item.is_read}
                            >
                              {item.is_read ? 'Read' : 'Mark as read'}
                            </button>
                            {item.url && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openNotification(item, true);
                                }}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300"
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
                      <p className="text-[12px] font-bold text-slate-900 truncate">Registrar</p>
                      <p className="text-[10px] text-slate-600 font-medium truncate">{props?.auth?.user?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <CaretDown size={12} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-48 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                    {/* Actions */}
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 text-[12.5px] font-semibold text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[12.5px] font-semibold text-slate-900 hover:text-red-600 hover:bg-red-50 transition-colors group"
                    >
                      <SignOut size={16} className="transition-colors group-hover:text-red-600" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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

// Nav item
function NavItem({ href, icon, label, open, url }) {
  const isActive = url.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-[11px] font-medium ${
        isActive 
          ? 'bg-blue-700/60 text-white shadow-md' 
          : 'text-blue-100 hover:bg-blue-800/40'
      }`}
    >
      {icon}
      {open && <span className="truncate">{label}</span>}
    </Link>
  );
}

// Expandable menu
function ExpandableMenu({ title, icon, open, isOpen, toggle, url, items }) {
  const isAnyActive = items.some(item => url.startsWith(item.href));
  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition text-[11px] font-medium ${
          isOpen || isAnyActive
            ? 'bg-blue-700/60 text-white'
            : 'text-blue-100 hover:bg-blue-800/40'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon}
          {open && <span className="truncate">{title}</span>}
        </div>
        {open && (isOpen ? <CaretDown size={14} /> : <CaretRight size={14} />)}
      </button>

      {isOpen && open && (
        <div className="ml-2 mt-1 space-y-1 border-l border-blue-800/30 pl-2">
          {items.map((item, i) => (
            <NavItem key={i} href={item.href} icon={item.icon} label={item.label} open={open} url={url} />
          ))}
        </div>
      )}
    </div>
  );
}
