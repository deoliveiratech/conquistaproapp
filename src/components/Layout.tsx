import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Home,
    PlusCircle,
    Tags,
    Bell,
    Menu,
    User as UserIcon,
    X,
    Sun,
    Moon,
    LogOut,
    UserCircle
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { SyncIndicator } from "./SyncIndicator";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { label: "Dash", path: "/", icon: <Home size={20} /> },
        { label: "Novo Objetivo", path: "/novo-objetivo", icon: <PlusCircle size={20} /> },
        { label: "Categorias", path: "/categorias", icon: <Tags size={20} /> },
        { label: "Meu Perfil", path: "/profile", icon: <UserCircle size={20} /> },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsSidebarOpen(false);
            navigate("/login");
        } catch (err) {
            console.error("Erro ao sair:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300 overflow-x-hidden">
            {/* Top Menu - Fixed */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-2 md:px-4 shadow-sm transition-colors">
                <div className="flex items-center gap-2">
                    <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <span className="hidden sm:inline">MetasPro</span>
                        <span className="sm:hidden">MP</span>
                    </Link>
                </div>


                <div className="flex items-center gap-1 sm:gap-3">
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative">
                        <Bell size={22} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                    </button>

                    <Link to="/profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 overflow-hidden border border-indigo-200 dark:border-indigo-800 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={22} />
                        )}
                    </Link>

                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            {/* Sidebar / Mobile Menu */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[60] flex">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <aside className="relative ml-auto w-64 h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">Menu</span>
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
                            >
                                {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
                            </button>
                            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                                <X size={24} />
                            </button>
                        </div>
                        <nav className="flex-1 p-2 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${location.pathname === item.path
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))}
                            {user && (
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-semibold mt-4"
                                >
                                    <LogOut size={20} />
                                    Sair da Conta
                                </button>
                            )}
                        </nav>
                        <div className="p-4 border-t dark:border-gray-700 text-xs text-gray-400 text-center">
                            ConquistaPro v1.0
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 pt-20 pb-24 md:pb-6 px-2 max-w-7xl mx-auto w-full">
                {children}
            </main>

            {/* Bottom Menu - Fixed (Mobile Only) */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 flex items-center justify-around md:hidden px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition-colors">
                <Link
                    to="/novo-objetivo"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${location.pathname === "/novo-objetivo" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                        }`}
                >
                    <PlusCircle size={24} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Objetivo</span>
                </Link>
                <Link
                    to="/categorias"
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${location.pathname === "/categorias" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                        }`}
                >
                    <Tags size={24} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Categorias</span>
                </Link>
            </nav>
            <SyncIndicator />
        </div >
    );
};

export default Layout;
