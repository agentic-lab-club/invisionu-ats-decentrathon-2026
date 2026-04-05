"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, User, LogOut, Home, FileText, Settings, Loader2 } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

export default function CandidateNavbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Получаем данные пользователя из API (или из токена)
  useEffect(() => {
    const fetchUser = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        // Use the real backend route exposed by the auth module.
        const res = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Вариант 2: декодируем userId из JWT (если в токене есть поле sub или user_id)
          const payload = token.split('.')[1];
          if (payload) {
            const decoded = JSON.parse(atob(payload));
            const userId = decoded.sub || decoded.user_id || decoded.id;
            if (userId) {
              setUser({ id: userId, name: "", email: "" }); // хотя бы ID
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
    // Если user ещё не загружен или нет ID, ведём на /status (без ID)
    { href: user?.id ? `/status/${user.id}` : "/status", label: "Your application", icon: FileText },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-gradient-to-r from-[#b5e220] to-[#8aaa18] bg-clip-text text-transparent">
                inVision U
              </span>
            </Link>
          </div>

          {/* Десктопное меню */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(href)
                    ? "text-[#8aaa18] border-b-2 border-[#b5e220] pb-1"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Правая часть */}
          <div className="hidden md:flex items-center space-x-4">
            {loadingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-sm focus:outline-none rounded-full hover:bg-gray-50 p-1 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b5e220] to-[#8aaa18] flex items-center justify-center text-white font-semibold">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="text-gray-700 hidden lg:inline">
                    {user.name?.split(" ")[0] || user.email?.split("@")[0] || "User"}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <hr className="my-1" />
                      <Link
                        href="/logout"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
            )}
          </div>

          {/* Мобильное меню */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-900 focus:outline-none">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Мобильное выпадающее меню */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(href) ? "bg-[#b5e220]/10 text-[#8aaa18]" : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              <hr className="my-2" />
              {loadingUser ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : user ? (
                <>
                  <div className="px-2 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span>{user.email || user.name}</span>
                  </div>
                  <Link
                    href="/logout"
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
