'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaBookOpen,
  FaUserFriends,
  FaListAlt,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from 'react-icons/fa';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: <FaChartBar /> },
  { name: 'Poems', href: '/dashboard/poems', icon: <FaBookOpen /> },
  { name: 'Poem Requests', href: '/dashboard/poem-requests', icon: <FaListAlt /> },
  // { name: 'Users', href: '/dashboard/users', icon: <FaUserFriends /> },
];

export default function Sidebar({ onLogout }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef();

  // Handle closing sidebar on outside click for mobile
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Desktop sidebar (always visible)
  const DesktopSidebar = (
    <aside
      className="
        hidden lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:min-w-56
        lg:flex lg:flex-col bg-white border-r border-purple-100
        text-purple-800 shadow-2xl z-40
        transition-all duration-300
      "
    >
      <div className="flex items-center pl-6 h-16 border-b border-purple-100">
        <span className="text-xl font-extrabold tracking-tight text-purple-700">
          <span className="text-purple-500">Poem</span>
          <span className="ml-1">Dashboard</span>
        </span>
      </div>
      <nav className="flex-1 py-8">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-4 px-6 py-3 rounded-l-full
                    text-base font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 shadow-md'
                        : 'hover:bg-purple-50 hover:text-purple-600'
                    }
                    group
                  `}
                >
                  <span
                    className={`
                      text-lg transition
                      ${isActive ? 'text-purple-500' : 'text-purple-400 group-hover:text-purple-600'}
                    `}
                  >
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mb-7 px-6">
        <button
          onClick={onLogout}
          className="
            w-full flex items-center gap-3 justify-center
            px-4 py-2 rounded-full bg-purple-100 hover:bg-purple-200
            text-purple-700 hover:text-purple-900 font-semibold
            transition-all duration-200 shadow
          "
        >
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </aside>
  );

  // Mobile navbar with hamburger (always fixed at top)
  const MobileNavbar = (
    <div className="lg:hidden fixed top-0 left-0 w-full h-16 z-50 bg-white border-b border-purple-100 flex items-center shadow-sm">
      <button
        className="
          ml-4 bg-white rounded-full p-2 shadow 
          hover:bg-purple-50 transition border border-purple-100
        "
        onClick={() => setOpen(true)}
        aria-label="Open sidebar"
      >
        <FaBars className="h-6 w-6 text-purple-700" />
      </button>
      <span className="ml-4 text-xl font-extrabold tracking-tight text-purple-700">
        <span className="text-purple-500">Poem</span>
        <span className="ml-1">Dashboard</span>
      </span>
    </div>
  );

  // Mobile sidebar (off-canvas drawer)
  const MobileSidebar = (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/30 z-50 transition-opacity duration-200
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden={!open}
      />
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-screen w-64 min-w-56 flex flex-col
          bg-white border-r border-purple-100 text-purple-800 shadow-2xl z-50
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{top: 0}}
      >
        <div className="flex items-center justify-between pl-6 pr-4 h-16 border-b border-purple-100">
          <span className="text-xl font-extrabold tracking-tight text-purple-700">
            <span className="text-purple-500">Poem</span>
            <span className="ml-1">Dashboard</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-full hover:bg-purple-50 transition"
            aria-label="Close sidebar"
          >
            <FaTimes className="h-5 w-5 text-purple-700" />
          </button>
        </div>
        <nav className="flex-1 py-8">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center gap-4 px-6 py-3 rounded-l-full
                      text-base font-medium
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-purple-100 text-purple-700 shadow-md'
                          : 'hover:bg-purple-50 hover:text-purple-600'
                      }
                      group
                    `}
                  >
                    <span
                      className={`
                        text-lg transition
                        ${isActive ? 'text-purple-500' : 'text-purple-400 group-hover:text-purple-600'}
                      `}
                    >
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mb-7 px-6">
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="
              w-full flex items-center gap-3 justify-center
              px-4 py-2 rounded-full bg-purple-100 hover:bg-purple-200
              text-purple-700 hover:text-purple-900 font-semibold
              transition-all duration-200 shadow
            "
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <>
      {/* Desktop */}
      {DesktopSidebar}
      {/* Mobile Navbar */}
      {MobileNavbar}
      {/* Mobile Sidebar */}
      {MobileSidebar}
      {/* Spacer for content so it doesn't go under navbar on mobile */}
      <div className="lg:hidden h-16" aria-hidden="true"></div>
    </>
  );
}