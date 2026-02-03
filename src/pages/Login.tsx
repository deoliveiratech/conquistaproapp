import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { LogIn, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (err: any) {
            setError("E-mail ou senha incorretos.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        setError("");
        try {
            await signInWithPopup(auth, provider);
            navigate("/");
        } catch (err: any) {
            console.error("Erro no Google Login:", err);
            if (err.code === "auth/unauthorized-domain") {
                setError("Este domínio não está autorizado no Firebase. Adicione o domínio da Netlify nas configurações de autenticação do Firebase.");
            } else if (err.code === "auth/popup-closed-by-user") {
                // Silently handle user closing the popup
            } else {
                setError("Ocorreu um erro ao entrar com Google. Tente novamente.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 transition-colors">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4 scale-90 sm:scale-100 transition-transform">
                        <LogIn className="text-indigo-600 dark:text-indigo-400" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bem-vindo de volta</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Acesse sua conta para continuar</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={20} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                                placeholder="exemplo@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                    >
                        {loading ? "Entrando..." : "Entrar"}
                        <ArrowRight size={20} />
                    </button>
                </form>

                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100 dark:border-gray-700"></div>
                    </div>
                    <span className="relative bg-white dark:bg-gray-800 px-3 text-xs text-gray-400 uppercase tracking-widest">ou</span>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                >
                    <img src="public/login_google.png" alt="Google" className="w-5 h-5" />
                    Entrar com Google
                </button>

                <p className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Ainda não tem conta?{" "}
                    <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        Crie uma agora
                    </Link>
                </p>
            </div>
        </div>
    );
}
