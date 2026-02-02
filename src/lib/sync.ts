
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
        await dbLocal.syncQueue.add({
            type,
            collection: collectionName,
            docId,
            data,
            timestamp: Date.now(),
            status: 'PENDING'
        });

        // Try to process immediately if online
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
                    console.error(`Error syncing item ${item.id}:`, error);
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

        switch (item.type) {
            case 'CREATE':
            case 'UPDATE':
                // Ensure we don't sync local-only fields if any
                // Remove undefined values as Firestore doesn't like them
                const cleanData = JSON.parse(JSON.stringify(item.data));
                await setDoc(ref, cleanData, { merge: true });
                break;
            case 'DELETE':
                await deleteDoc(ref);
                break;
        }
    }

    static async syncAll() {
        if (!navigator.onLine) return;

        try {
            // 1. Sync Categorias (assuming flat collection)
            await getDocs(collection(firestore, "categorias"));
            // We might want to store categories locally too if not already
            // For now, focusing on the main structured data: Objetivos -> Fases -> Tarefas

            // 2. Sync Objetivos
            const objSnap = await getDocs(collection(firestore, "objetivos"));
            const objetivos = objSnap.docs.map(d => ({ ...d.data(), id: d.id } as Objetivo));
            await dbLocal.objetivos.bulkPut(objetivos);

            // 3. Deep sync for subcollections
            // This is expensive, optimization: use a recursive function or flat structure in future
            for (const obj of objetivos) {
                if (!obj.id) continue;

                const fasesSnap = await getDocs(collection(firestore, "objetivos", obj.id, "fases"));
                const fases = fasesSnap.docs.map(d => ({ ...d.data(), id: d.id, objetivoId: obj.id! } as Fase));
                await dbLocal.fases.bulkPut(fases);

                for (const fase of fases) {
                    const tarefasSnap = await getDocs(collection(firestore, "objetivos", obj.id, "fases", fase.id, "tarefas"));
                    const tarefas = tarefasSnap.docs.map(d => ({ ...d.data(), id: d.id, faseId: fase.id } as Tarefa));
                    await dbLocal.tarefas.bulkPut(tarefas);
                }
            }
        } catch (error) {
            console.error("Error during full sync:", error);
        }
    }
}
