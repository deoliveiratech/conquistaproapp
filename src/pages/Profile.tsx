import React, { useState, useEffect } from "react";
import { auth, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    User,
    Mail,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    Database,
    ArrowRight,
    AlertTriangle,
    History
} from "lucide-react";
import {
    findUserOrganizations,
    migrateOrganizationToUser,
    hasRootObjectives,
    migrateRootCollectionToUser
} from "@/lib/migrateData";
import { SyncService } from "@/lib/sync";

export default function Profile() {
    const user = auth.currentUser;
    const [name, setName] = useState(user?.displayName || "");
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Migration State
    const [orgs, setOrgs] = useState<{ id: string, name: string }[]>([]);
    const [hasRootObjs, setHasRootObjs] = useState(false);
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [migrating, setMigrating] = useState(false);
    const [migrationSuccess, setMigrationSuccess] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            findUserOrganizations(user.uid).then(setOrgs);
            hasRootObjectives().then(setHasRootObjs);
        }
    }, [user]);

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

    const handleMigrate = async (type: 'org' | 'root') => {
        if (type === 'org' && !selectedOrgId) return;
        if (!user || migrating) return;

        const msg = type === 'org'
            ? "Isso copiará todos os objetivos, fases e tarefas da organização selecionada para seu novo perfil individual. Deseja continuar?"
            : "Isso copiará todos os objetivos, fases e tarefas da coleção GLOBAL 'objetivos' para seu novo perfil individual. Deseja continuar?";

        if (!confirm(msg)) return;

        setMigrating(true);
        try {
            const result = type === 'org'
                ? await migrateOrganizationToUser(selectedOrgId, user.uid)
                : await migrateRootCollectionToUser(user.uid);

            setMigrationSuccess(result.count);
            // After migration, trigger a sync to pull the new data locally
            await SyncService.syncAll(user.uid);
        } catch (err) {
            console.error("Erro na migração:", err);
            alert("Ocorreu um erro durante a migração. Verifique o console.");
        } finally {
            setMigrating(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Meu Perfil</h1>
                <p className="text-gray-500 dark:text-gray-400">Gerencie suas informações pessoais e dados</p>
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

            {/* Migration Section */}
            {orgs.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Migração de Dados (Organizações)</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Mova seus dados de organizações antigas</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-300 text-sm">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p>Seus dados agora são isolados por usuário. Selecione uma organização abaixo para copiar seus objetivos existentes para sua conta pessoal.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Selecionar Organização Origem</label>
                            <select
                                value={selectedOrgId}
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            >
                                <option value="">Selecione uma organização...</option>
                                {orgs.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>

                        {migrationSuccess !== null && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl flex flex-col gap-2 text-green-600 dark:text-green-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3 font-bold">
                                    <CheckCircle2 size={20} />
                                    Migração concluída com sucesso!
                                </div>
                                <p>{migrationSuccess} objetivos foram copiados.</p>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="text-xs font-black uppercase tracking-widest bg-green-600 text-white px-3 py-1.5 rounded-lg mt-2 w-fit hover:bg-green-700"
                                >
                                    Ver Meus Objetivos
                                </button>
                            </div>
                        )}

                        {!migrationSuccess && (
                            <button
                                onClick={() => handleMigrate('org')}
                                disabled={!selectedOrgId || migrating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {migrating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Migrando Dados...
                                    </>
                                ) : (
                                    <>
                                        Iniciar Migração de Organização
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Root Migration Section */}
            {hasRootObjs && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Migração de Coleção Antiga</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Detectamos dados na coleção legado 'objetivos'</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl flex gap-3 text-indigo-700 dark:text-indigo-300 text-sm">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p>Foram encontrados objetivos na raiz do banco de dados (sistema antigo). Você pode migrá-los para sua conta pessoal agora.</p>
                        </div>

                        {migrationSuccess !== null && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl flex flex-col gap-2 text-green-600 dark:text-green-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3 font-bold">
                                    <CheckCircle2 size={20} />
                                    Migração concluída com sucesso!
                                </div>
                                <p>{migrationSuccess} objetivos foram copiados.</p>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="text-xs font-black uppercase tracking-widest bg-green-600 text-white px-3 py-1.5 rounded-lg mt-2 w-fit hover:bg-green-700"
                                >
                                    Ver Meus Objetivos
                                </button>
                            </div>
                        )}

                        {!migrationSuccess && (
                            <button
                                onClick={() => handleMigrate('root')}
                                disabled={migrating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {migrating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Migrando Dados...
                                    </>
                                ) : (
                                    <>
                                        Migrar Coleção Legado
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
