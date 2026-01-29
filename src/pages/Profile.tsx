import React, { useState } from "react";
import { auth, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { User, Mail, Camera, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function Profile() {
    const user = auth.currentUser;
    const [name, setName] = useState(user?.displayName || "");
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            setPhotoURL(url);
        } catch (err) {
            console.error("Erro ao fazer upload:", err);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setSuccess(false);
        try {
            await updateProfile(user, {
                displayName: name,
                photoURL: photoURL
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Erro ao salvar perfil:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Meu Perfil</h1>
                <p className="text-gray-500 dark:text-gray-400">Gerencie suas informações pessoais</p>
            </header>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                {photoURL ? (
                                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={64} />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                                        <Loader2 size={32} className="animate-spin" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                                <Camera size={20} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            </label>
                        </div>
                        <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Foto de perfil</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <User size={16} /> Nome completo
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                placeholder="Seu Nome"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <Mail size={16} /> E-mail
                            </label>
                            <input
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 outline-none cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {success && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl flex items-center gap-3 text-green-600 dark:text-green-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <CheckCircle2 size={20} />
                            Perfil atualizado com sucesso!
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {saving ? "Salvando..." : "Salvar Alterações"}
                        <Save size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
