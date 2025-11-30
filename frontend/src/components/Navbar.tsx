import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MapPin, Users, Shield, LogOut, Menu, X, Smartphone } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Map', icon: MapPin },
    { path: '/family', label: 'Family', icon: Users },
    { path: '/owntracks', label: 'OwnTracks', icon: Smartphone },
  ];

  if (user?.is_admin) {
    navLinks.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <span className="hidden sm:block text-xl font-bold text-gray-900">
              Family Tracker
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
                  isActive(link.path)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary flex items-center gap-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            <div className="sm:hidden pb-3 border-b border-gray-200 mb-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200',
                  isActive(link.path)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
