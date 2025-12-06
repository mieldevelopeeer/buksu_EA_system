import { Link, usePage, router } from '@inertiajs/react';
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
  BellSimple,
  SignOut,
} from 'phosphor-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import '@fontsource/poppins/index.css';

export default function FacultyLayout({ children }) {
  const page = usePage();
  const { auth, enrolledStudents = [], facultyEvaluationAccess = {}, notifications: initialNotifications = [] } = page.props;
  const isClassesPage = page.url?.startsWith('/faculty/classes');
  const navSegments = (() => {
    const segments = page.url?.split('/').filter(Boolean) ?? [];
    if (segments.length === 0) {
      return ['Dashboard'];
    }
    return segments.map((segment) =>
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  })();

  const defaultMenuState = {
    classes: false,
    grades: false,
    assessment: false,
  };

  // Sidebar state
  const savedSidebar = localStorage.getItem('sidebarOpen') === 'true';
  const [sidebarOpen, setSidebarOpen] = useState(savedSidebar);

  // Menu state
  let savedMenu = defaultMenuState;
  try {
    const parsed = JSON.parse(localStorage.getItem('openMenu'));
    savedMenu = parsed ? { ...defaultMenuState, ...parsed } : defaultMenuState;
  } catch (error) {
    savedMenu = defaultMenuState;
  }
  const [openMenu, setOpenMenu] = useState(savedMenu);

  const initialEvaluationAccess = facultyEvaluationAccess ?? {};
  const [evaluationAccess, setEvaluationAccess] = useState(initialEvaluationAccess);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notifLoading, setNotifLoading] = useState(false);
  const unreadCount = notifications.filter((entry) => !entry.is_read).length;
  const seenNotificationIdsRef = useRef(new Set((initialNotifications ?? []).map((item) => item.id)));

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

  const handleNotificationAction = async (notification, navigate = false) => {
    if (!notification) return;
    await markNotificationAsRead(notification.id);
    if (navigate && notification.url) {
      router.visit(notification.url);
      setNotifOpen(false);
    }
  };

  const openNotification = (notification) => {
    if (!notification) return;
    handleNotificationAction(notification, Boolean(notification.url));
  };

  // Persist sidebar open/close
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen);
  }, [sidebarOpen]);

  // Persist open menus
  useEffect(() => {
    localStorage.setItem('openMenu', JSON.stringify(openMenu));
  }, [openMenu]);

  useEffect(() => {
    setEvaluationAccess(initialEvaluationAccess);
  }, [initialEvaluationAccess]);

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

  const evaluationPollPausedRef = useRef(false);
  const currentPathRef = useRef(page.url);

  useEffect(() => {
    currentPathRef.current = page.url;
  }, [page.url]);

  useEffect(() => {
    const pauseHandler = () => {
      evaluationPollPausedRef.current = true;
    };
    const resumeHandler = () => {
      evaluationPollPausedRef.current = false;
    };

    window.addEventListener('faculty:pause-evaluation-access-poll', pauseHandler);
    window.addEventListener('faculty:resume-evaluation-access-poll', resumeHandler);

    return () => {
      window.removeEventListener('faculty:pause-evaluation-access-poll', pauseHandler);
      window.removeEventListener('faculty:resume-evaluation-access-poll', resumeHandler);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const fetchEvaluationAccess = async () => {
      const currentPath = currentPathRef.current || '';
      const isSubjectLoadRoute =
        currentPath.startsWith('/faculty/evaluation/subjectload') ||
        currentPath.startsWith('/program-head/evaluation/subjectload');

      if (evaluationPollPausedRef.current || isSubjectLoadRoute) {
        return;
      }
      try {
        const response = await axios.get(route('faculty.evaluation.access_snapshot'));
        if (isMounted && response?.data) {
          setEvaluationAccess(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh evaluation permissions', error);
      }
    };

    fetchEvaluationAccess();
    timerId = setInterval(fetchEvaluationAccess, 30000);

    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

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
    timerId = setInterval(fetchNotifications, 15000);

    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, []);

  useEffect(() => {
    const cache = seenNotificationIdsRef.current;
    const newDecisions = (notifications ?? []).filter(
      (item) => item?.type === 'grade_change_decision' && item?.id && !cache.has(item.id)
    );

    if (newDecisions.length) {
      newDecisions.forEach((item) => cache.add(item.id));
    }
  }, [notifications]);

  const toggleMenu = (menu) => {
    setOpenMenu((prev) => {
      const newState = { ...prev, [menu]: !prev[menu] };
      return newState;
    });
  };

  const hasAnyExpiredPermission = (evaluationAccess?.expiredPermissions ?? []).length > 0;
  const isEnrollmentPage = page.url?.startsWith('/faculty/evaluation/enrollment');
  const isSubjectLoadPage = page.url?.startsWith('/faculty/evaluation/subjectload');

  useEffect(() => {
    if (!hasAnyExpiredPermission || isEnrollmentPage || isSubjectLoadPage) {
      return;
    }

    Swal.fire({
      toast: true,
      icon: 'warning',
      title: 'Your evaluation permission has expired',
      text: 'Please coordinate with your Program Head to renew your access.',
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    });
  }, [hasAnyExpiredPermission, isEnrollmentPage, isSubjectLoadPage]);

  const {
    hasPermission: hasAssessmentPermission = false,
    canPrintCor: canPrintCorAccess = false,
    departmentCourses: evaluationCourses = [],
  } = evaluationAccess ?? {};

  const assessmentMenuItems = [
    {
      href: '/faculty/enrollment-assessment',
      icon: <FileSearch size={18} />,
      label: 'Overview',
    },
    ...evaluationCourses.map((course) => ({
      href: `/faculty/evaluation/enrollment?course=${course.id}`,
      icon: <FileText size={18} />,
      label: `${course.code ?? 'Course'}${course.name ? ` • ${course.name}` : ''}`,
    })),
  ];

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
    <div className="flex h-screen bg-gray-100 font-[Poppins] text-[11px]">
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-blue-950 to-blue-900 text-white p-3 transition-all duration-300 ${
          sidebarOpen ? 'w-48' : 'w-16'
        } shadow-2xl h-screen sticky top-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.35)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-track]:bg-transparent`}
      >
        <div className="mb-6 flex items-center space-x-2">
          <img src="/images/buksu_logo.png" alt="Logo" className="w-8 h-8" />
          {sidebarOpen && (
            <span className="text-xs font-bold leading-tight">
              Bukidnon State University Alubijid Campus
            </span>
          )}
        </div>

        <nav className="space-y-2.5 text-[12px]">
          <NavItem
            href="/faculty/dashboard"
            icon={<House size={22} />}
            label="Dashboard"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/classes"
            icon={<Notebook size={22} />}
            label="My Classes"
            open={sidebarOpen}
          />

          <NavItem
            href="/faculty/students-list"
            icon={<Users size={22} />}
            label="Students Lists"
            open={sidebarOpen}
          />

           {/* <NavItem
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
          /> */}

          {hasAssessmentPermission && (
            <div className="pt-3">
              <ExpandableMenu
                title="Enrollment Assessment"
                icon={<FileSearch size={22} />}
                isOpen={openMenu.assessment}
                toggle={() => toggleMenu('assessment')}
                items={assessmentMenuItems}
                open={sidebarOpen}
              />
              {sidebarOpen && canPrintCorAccess && (
                <div className="mt-2 rounded-lg border border-blue-100/40 bg-white/10 px-3 py-2 text-[10px] text-blue-100">
                  You can print COR for permitted courses.
                </div>
              )}
              {sidebarOpen && evaluationCourses.length === 0 && (
                <p className="mt-1 px-2 text-[10px] text-blue-100/80">
                  No department courses found yet.
                </p>
              )}
            </div>
          )}

          {sidebarOpen && (
            <p className="px-2 text-[10.5px] uppercase tracking-[0.2em] text-blue-200 mt-4 font-bold opacity-90">
              Reports
            </p>
          )}
{/* 
          <NavItem
            href="/faculty/reports/attendance"
            icon={<Calendar size={20} />}
            label="Attendance Reports"
            open={sidebarOpen}
          */ }

          <NavItem
            href="/faculty/reports/gradereport"
            icon={<Clipboard size={20} />}
            label="Grade Reports"
            open={sidebarOpen}
          />

         
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.25)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/40 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="shrink-0 sticky top-0 z-40 bg-white border-b-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:border-slate-300"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <CaretLeft size={16} /> : <List size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-medium text-slate-600">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <div className="relative z-50" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setDropdownOpen(false);
                  }}
                  className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:shadow-sm"
                  aria-label="Notifications"
                >
                  <BellSimple
                    size={16}
                    className={`${notifLoading ? 'animate-notif-wiggle text-sky-500' : ''}`}
                  />
                  {notifications.some((item) => !item.is_read) && (
                    <span className="absolute -top-1 -right-1 flex h-3 min-w-[0.85rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-600 shadow-2xl z-[70]">
                    <div className="mb-3 flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-[12px] font-bold text-slate-700">Notifications</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Unread: {notifications.filter((entry) => !entry.is_read).length}</span>
                        <Link
                          href={route('notifications.index')}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/40">
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
                          onClick={() => openNotification(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openNotification(item);
                            }
                          }}
                          className={`rounded-xl border px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 transition ${
                            item.is_read ? 'border-slate-100 bg-slate-50 hover:bg-slate-100' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12px] font-semibold text-slate-700 flex-1">{item.title}</p>
                            {item.type && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700 whitespace-nowrap">
                                {item.type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{item.message}</p>
                          {item.created_at && (
                            <p className="mt-2 text-[10px] text-slate-400">
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
                                handleNotificationAction(item, false);
                              }}
                              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                              disabled={item.is_read}
                            >
                              {item.is_read ? 'Read' : 'Mark as read'}
                            </button>
                            {item.url && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleNotificationAction(item, true);
                                }}
                                className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition"
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
              {/* User Dropdown */}
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 transition hover:border-slate-300 hover:shadow-sm"
                >
                  {auth?.user?.profile_picture ? (
                    <img
                      src={auth.user.profile_picture.startsWith('http') ? auth.user.profile_picture : `/storage/${auth.user.profile_picture}`}
                      alt="Profile"
                      className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  {sidebarOpen && <CaretDown size={12} />}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-100 bg-white shadow-xl z-50 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        {auth?.user?.profile_picture ? (
                          <img
                            src={auth.user.profile_picture.startsWith('http') ? auth.user.profile_picture : `/storage/${auth.user.profile_picture}`}
                            alt="Profile"
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <User size={18} className="text-slate-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-slate-800">Faculty Member</p>
                          <p className="text-[11px] text-slate-600 truncate">{auth?.user?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        <User size={14} />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition text-left"
                      >
                        <SignOut size={14} />
                        <span>Sign Out</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {groupedStudents.length > 0 && (
          <section className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm mx-4 mt-4">
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

        <div className={`flex-1 px-4 pb-4 ${isClassesPage ? 'overflow-y-auto pr-1' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, open }) {
  const isActive = window.location.pathname === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3.5 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-blue-700/50 ${
        isActive ? 'bg-blue-800/80 font-bold text-white shadow-lg' : 'text-white/85 hover:text-white'
      }`}
    >
      {icon}
      {open && <span className="text-[12px] font-medium">{label}</span>}
    </Link>
  );
}

function ExpandableMenu({ title, icon, isOpen, toggle, items, open }) {
  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center justify-between w-full px-3 py-2 hover:bg-blue-700/50 rounded-lg transition-all duration-200 text-white/85 hover:text-white ${
          !open ? 'justify-center' : ''
        }`}
      >
        <div className="flex items-center gap-3.5">
          {icon}
          {open && <span className="text-[12px] font-medium">{title}</span>}
        </div>
        {open && <span>{isOpen ? <CaretDown size={18} /> : <CaretRight size={18} />}</span>}
      </button>
      {isOpen && open && (
        <div className="ml-6 mt-2 space-y-2">
          {items.map((item, i) => (
            <NavItem key={i} href={item.href} icon={item.icon} label={item.label} open={open} />
          ))}
        </div>
      )}
    </div>
  );
}
