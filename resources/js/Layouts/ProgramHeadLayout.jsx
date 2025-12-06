import { Link, usePage, router } from "@inertiajs/react";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  House,
  Clipboard,
  Users,
  FileText,
  NotePencil,
  Notebook,
  User,
  List,
  CaretLeft,
  AddressBook,
  BookOpen,
  Book,
  CheckCircle,
  CaretDown,
  ChartPie,
  Clock,
  GraduationCap,
  ShieldCheck,
  BellSimple,
  Gauge,
  SignOut,
} from "phosphor-react";

import "@fontsource/poppins/index.css";
import Swal from "sweetalert2";

export default function ProgramHeadLayout({ children }) {
  const { url, props } = usePage();
  const { auth } = props;

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem("phSidebarOpen");
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(props?.notifications ?? []);
  const [notifLoading, setNotifLoading] = useState(false);
  const unreadCount = notifications.filter((entry) => !entry.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const fetchNotifications = async () => {
      try {
        setNotifLoading(true);
        const response = await axios.get(route("notifications.feed"));
        if (isMounted) {
          setNotifications(response.data?.data ?? []);
        }
      } catch (error) {
        console.error("Failed to load notifications", error);
      } finally {
        if (isMounted) {
          setNotifLoading(false);
        }
      }
    };

    fetchNotifications();
    intervalId = setInterval(fetchNotifications, 15000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const markNotificationAsRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await axios.post(route("notifications.read", notificationId));
      setNotifications((prev = []) =>
        prev.map((entry) => (entry.id === notificationId ? { ...entry, is_read: true } : entry))
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
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

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      localStorage.setItem("phSidebarOpen", JSON.stringify(!prev));
      return !prev;
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, logout",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Logging out...",
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });
        localStorage.clear();
        sessionStorage.clear();
        router.post(route("logout"), { onFinish: () => Swal.close() });
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
          <NavItem
            href="/program-head/dashboard"
            icon={<House size={18} />}
            label="Dashboard"
            open={sidebarOpen}
            url={url}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Evaluation Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Evaluation
            </p>
          )}
          <NavItem
            href="/program-head/enrollment"
            icon={<BookOpen size={16} />}
            label="Enrollment"
            open={sidebarOpen}
            url={url}
          />
          <PendingNavItem
            href="/program-head/pending-enrollments"
            icon={<NotePencil size={16} />}
            label="Pending Pre-Enrolls"
            open={sidebarOpen}
            url={url}
            badge={props.pendingEnrollmentCount ?? 0}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Students Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Students
            </p>
          )}
          <NavItem
            href="/program-head/students-list"
            icon={<Users size={16} />}
            label="Student Profile"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/students/enrolled"
            icon={<CheckCircle size={16} />}
            label="Enrolled Students"
            open={sidebarOpen}
            url={url}
          />
          {/* <NavItem
            href="/program-head/academic-records"
            icon={<FileText size={16} />}
            label="Academic Records"
            open={sidebarOpen}
            url={url}
          /> */}

          <div className="border-t border-blue-800/30 my-3" />

          {/* Faculty Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Faculty
            </p>
          )}
          <NavItem
            href="/program-head/faculties"
            icon={<Users size={18} />}
            label="Faculties"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/faculties/assignfaculty"
            icon={<AddressBook size={16} />}
            label="Class Schedule"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/faculty-permissions"
            icon={<ShieldCheck size={18} />}
            label="Faculty Permissions"
            open={sidebarOpen}
            url={url}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Configuration Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Configuration
            </p>
          )}
          <NavItem
            href="/program-head/sections/capacity"
            icon={<Gauge size={16} />}
            label="Sections Capacity"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/curricula"
            icon={<Book size={16} />}
            label="Curriculum"
            open={sidebarOpen}
            url={url}
          />

          <div className="border-t border-blue-800/30 my-3" />

          {/* Reports Section */}
          {sidebarOpen && (
            <p className="px-3 text-[9.5px] uppercase tracking-[0.25em] text-blue-100 font-bold mb-2 mt-1">
              Reports
            </p>
          )}
          <NavItem
            href="/program-head/reports/enrollment"
            icon={<ChartPie size={16} />}
            label="Enrollment Report"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/reports/grades"
            icon={<GraduationCap size={16} />}
            label="Grades Report"
            open={sidebarOpen}
            url={url}
          />
          <NavItem
            href="/program-head/reports/attendance"
            icon={<Clock size={16} />}
            label="Attendance Report"
            open={sidebarOpen}
            url={url}
          />
        </nav>
      </aside>

      {/* Main Content */}
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
                    className={`transition-colors ${notifLoading ? "animate-notif-wiggle text-sky-500" : ""}`}
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white shadow-md">
                      {unreadCount > 99 ? "99+" : unreadCount}
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
                          href={route("notifications.index")}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">
                      {notifications.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-[11px] text-slate-400">
                          No notifications yet
                        </p>
                      )}
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openNotification(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openNotification(item);
                            }
                          }}
                          className={`rounded-xl border-2 px-3 py-2.5 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                            item.is_read ? "border-slate-100 bg-slate-50 hover:bg-slate-100" : "border-sky-200 bg-sky-50/80 hover:bg-sky-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11.5px] font-bold text-slate-900 flex-1">{item.title}</p>
                            {item.type && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate-700 flex-shrink-0">
                                {item.type.replace(/_/g, " ")}
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
                                handleNotificationAction(item, false);
                              }}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                              disabled={item.is_read}
                            >
                              {item.is_read ? "Read" : "Mark as read"}
                            </button>
                            {item.url && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleNotificationAction(item, true);
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
              <div className="relative z-40" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotifOpen(false);
                  }}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                  title="Profile"
                >
                  <User size={16} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {/* User Info Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3.5 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        {auth?.user?.profile_picture ? (
                          <img
                            src={auth.user.profile_picture}
                            alt="Profile"
                            className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex-shrink-0">
                            <User size={18} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-900 truncate">Program Head</p>
                          <p className="text-[10px] text-slate-600 font-medium truncate">{auth?.user?.email || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    
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

function PendingNavItem({ href, icon, label, open, url, badge = 0 }) {
  const isActive = url.startsWith(href);
  const hasBadge = Number(badge) > 0;

  return (
    <div className="relative group text-[12px] font-medium">
      <Link
        href={href}
        title={label}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-blue-500/20 text-blue-100 shadow-md border border-blue-400/30"
            : "text-blue-100/80 hover:bg-blue-800/50 hover:text-blue-50"
        }`}
      >
        <span className={`relative transition-colors ${
          isActive ? "text-blue-300" : "text-blue-200/70 group-hover:text-blue-200"
        }`}>
          {icon}
          {!open && hasBadge && (
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-amber-900 shadow-md">
              {badge}
            </span>
          )}
        </span>
        {open && (
          <span className="flex items-center gap-2">
            <span className="text-[11px]">{label}</span>
            {hasBadge && (
              <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-amber-900 shadow-sm">
                {badge}
              </span>
            )}
          </span>
        )}
      </Link>
      {!open && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap bg-gradient-to-r from-blue-900 to-blue-800 text-blue-50 px-3 py-1.5 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg pointer-events-none border border-blue-700/50">
          {label}
        </span>
      )}
    </div>
  );
}

function NavItem({ href, icon, label, open, url }) {
  const isActive = url.startsWith(href);

  return (
    <div className="relative group text-[12px] font-medium">
      <Link
        href={href}
        title={label}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? "bg-blue-500/20 text-blue-100 shadow-md border border-blue-400/30"
            : "text-blue-100/80 hover:bg-blue-800/50 hover:text-blue-50"
        }`}
      >
        <span className={`transition-colors ${
          isActive ? "text-blue-300" : "text-blue-200/70 group-hover:text-blue-200"
        }`}>
          {icon}
        </span>
        {open && <span className="text-[11px]">{label}</span>}
      </Link>
      {!open && (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap bg-gradient-to-r from-blue-900 to-blue-800 text-blue-50 px-3 py-1.5 rounded-lg text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg pointer-events-none border border-blue-700/50">
          {label}
        </span>
      )}
    </div>
  );
}
