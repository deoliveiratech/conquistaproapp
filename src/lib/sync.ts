
import { db as dbLocal, SyncQueueItem, Objetivo, Fase, Tarefa } from './db';
import { db as firestore } from './firebase';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
} from 'firebase/firestore';

export class SyncService {
    private static isSyncing = false;

    static async enqueueMutation(
        type: 'CREATE' | 'UPDATE' | 'DELETE',
        collectionName: string,
        docId: string,
        data?: any
    ) {
        // Extract userId if possible or it will be picked up from local object during sync
        // In this architecture, components should ensure userId is in the data or we provide it here.
        await dbLocal.syncQueue.add({
            type,
            collection: collectionName,
            docId,
            data,
            timestamp: Date.now(),
            status: 'PENDING'
        });

        if (navigator.onLine) {
            this.processQueue();
        }
    }

    static async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;
        this.isSyncing = true;

        try {
            const pendingItems = await dbLocal.syncQueue
                .where('status')
                .equals('PENDING')
                .sortBy('timestamp');

            for (const item of pendingItems) {
                if (!item.id) continue;

                try {
                    await this.syncItem(item);
                    await dbLocal.syncQueue.delete(item.id);
                } catch (error) {
                    console.error(`[SyncService] Error syncing item ${item.id}:`, error);
                    await dbLocal.syncQueue.update(item.id, {
                        status: 'ERROR',
                        error: JSON.stringify(error)
                    });
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private static async syncItem(item: SyncQueueItem) {
        const ref = doc(firestore, item.collection, item.docId);
        // console.log(`[SyncService] Syncing ${item.type} on ${item.collection}/${item.docId}`);

        switch (item.type) {
            case 'CREATE':
            case 'UPDATE':
                const cleanData = item.data ? JSON.parse(JSON.stringify(item.data)) : {};
                try {
                    await setDoc(ref, cleanData, { merge: true });
                    console.log(`[SyncService] Successfully synced ${item.docId}`);
                } catch (err) {
                    console.error(`[SyncService] Failed to sync ${item.docId}:`, err);
                    throw err;
                }
                break;
            case 'DELETE':
                try {
                    await deleteDoc(ref);
                    // console.log(`[SyncService] Successfully deleted ${item.docId}`);
                } catch (err) {
                    console.error(`[SyncService] Failed to delete ${item.docId}:`, err);
                    throw err;
                }
                break;
        }
    }

    static async syncAll(userId: string) {
        if (!navigator.onLine || !userId) return;

        try {
            // 1. Sync Objetivos
            const objSnap = await getDocs(collection(firestore, "users", userId, "objetivos"));
            const objetivos = objSnap.docs.map(d => ({ ...d.data(), id: d.id, userId } as Objetivo));

            // For now, simple overwrite for this user's data
            await dbLocal.objetivos.where("userId").equals(userId).delete();
            await dbLocal.objetivos.bulkPut(objetivos);

            for (const obj of objetivos) {
                if (!obj.id) continue;

                const fasesSnap = await getDocs(collection(firestore, "users", userId, "objetivos", obj.id, "fases"));
                const fases = fasesSnap.docs.map(d => ({ ...d.data(), id: d.id, objetivoId: obj.id!, userId } as Fase));
                await dbLocal.fases.where("objetivoId").equals(obj.id).delete();
                await dbLocal.fases.bulkPut(fases);

                for (const fase of fases) {
                    const tarefasSnap = await getDocs(collection(firestore, "users", userId, "objetivos", obj.id, "fases", fase.id, "tarefas"));
                    const tarefas = tarefasSnap.docs.map(d => ({ ...d.data(), id: d.id, faseId: fase.id, userId } as Tarefa));
                    await dbLocal.tarefas.where("faseId").equals(fase.id).delete();
                    await dbLocal.tarefas.bulkPut(tarefas);
                }
            }
        } catch (error) {
            console.error("[SyncService] Error during full sync:", error);
        }
    }
}
