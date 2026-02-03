
import { db as firestore } from './firebase';
import {
    collection,
    getDocs,
    doc,
    writeBatch,
    query,
    where,
    limit
} from 'firebase/firestore';

/**
 * Migrates data from an old organization to a new user UID.
 */
export async function migrateOrganizationToUser(orgId: string, userId: string) {
    console.log(`[Migration] Starting migration from Org: ${orgId} to User: ${userId}`);

    try {
        const objetivosSnap = await getDocs(collection(firestore, "organizations", orgId, "objetivos"));

        for (const objDoc of objetivosSnap.docs) {
            const objData = objDoc.data();
            const objId = objDoc.id;

            const batch = writeBatch(firestore);
            const newObjRef = doc(firestore, "users", userId, "objetivos", objId);
            batch.set(newObjRef, { ...objData, userId }, { merge: true });

            const fasesSnap = await getDocs(collection(firestore, "organizations", orgId, "objetivos", objId, "fases"));
            for (const faseDoc of fasesSnap.docs) {
                const faseData = faseDoc.data();
                const faseId = faseDoc.id;

                const newFaseRef = doc(firestore, "users", userId, "objetivos", objId, "fases", faseId);
                batch.set(newFaseRef, { ...faseData, userId }, { merge: true });

                const tarefasSnap = await getDocs(collection(firestore, "organizations", orgId, "objetivos", objId, "fases", faseId, "tarefas"));
                for (const tarefaDoc of tarefasSnap.docs) {
                    const tarefaData = tarefaDoc.data();
                    const tarefaId = tarefaDoc.id;

                    const newTarefaRef = doc(firestore, "users", userId, "objetivos", objId, "fases", faseId, "tarefas", tarefaId);
                    batch.set(newTarefaRef, { ...tarefaData, userId }, { merge: true });
                }
            }
            await batch.commit();
        }
        return { success: true, count: objetivosSnap.size };
    } catch (error) {
        console.error(`[Migration] Migration failed:`, error);
        throw error;
    }
}

/**
 * Migrates data from the legacy root 'objetivos' collection to a new user UID.
 */
export async function migrateRootCollectionToUser(userId: string) {
    console.log(`[Migration] Starting migration from root 'objetivos' to User: ${userId}`);

    try {
        const rootSnap = await getDocs(collection(firestore, "objetivos"));

        for (const objDoc of rootSnap.docs) {
            const objData = objDoc.data();
            const objId = objDoc.id;

            const batch = writeBatch(firestore);
            const newObjRef = doc(firestore, "users", userId, "objetivos", objId);
            batch.set(newObjRef, { ...objData, userId }, { merge: true });

            const fasesSnap = await getDocs(collection(firestore, "objetivos", objId, "fases"));
            for (const faseDoc of fasesSnap.docs) {
                const faseData = faseDoc.data();
                const faseId = faseDoc.id;

                const newFaseRef = doc(firestore, "users", userId, "objetivos", objId, "fases", faseId);
                batch.set(newFaseRef, { ...faseData, userId }, { merge: true });

                const tarefasSnap = await getDocs(collection(firestore, "objetivos", objId, "fases", faseId, "tarefas"));
                for (const tarefaDoc of tarefasSnap.docs) {
                    const tarefaData = tarefaDoc.data();
                    const tarefaId = tarefaDoc.id;

                    const newTarefaRef = doc(firestore, "users", userId, "objetivos", objId, "fases", faseId, "tarefas", tarefaId);
                    batch.set(newTarefaRef, { ...tarefaData, userId }, { merge: true });
                }
            }
            await batch.commit();
        }
        return { success: true, count: rootSnap.size };
    } catch (error) {
        console.error(`[Migration] Root migration failed:`, error);
        throw error;
    }
}

export async function hasRootObjectives() {
    try {
        const q = query(collection(firestore, "objetivos"), limit(1));
        const snap = await getDocs(q);
        return !snap.empty;
    } catch (err) {
        return false;
    }
}

export async function findUserOrganizations(userId: string) {
    const q = query(collection(firestore, "organizations"), where("ownerId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, name: d.data().name }));
}
