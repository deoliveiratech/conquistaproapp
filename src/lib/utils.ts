import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const registrarPresenca = async ({
  alunoId,
  nomeAluno,
  aulaId,
  nomeAula,
  statusAula,
}: {
  alunoId: string;
  nomeAluno: string;
  aulaId: string;
  nomeAula: string;
  statusAula: string; // agora pode ser qualquer string, não só "em andamento" ou "concluída"
}) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    const q = query(
      collection(db, "presencas"),
      where("alunoId", "==", alunoId),
      where("dataHora", ">=", Timestamp.fromDate(hoje)),
      where("dataHora", "<", Timestamp.fromDate(amanha))
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const docData = snapshot.docs[0].data();
      const statusAtual: string = docData.statusAula || "";
      const statusArray = statusAtual.split(";").map((s) => s.trim());

      // Adiciona novo status se ainda não estiver incluso
      if (!statusArray.includes(statusAula)) {
        const novoStatus = [...statusArray, statusAula].join("; ");
        await updateDoc(docRef, {
          statusAula: novoStatus,
          aulaId,
          nomeAula,
          dataHora: Timestamp.now(), // opcional: atualizar horário
        });
        console.log("Presença atualizada com novo status.");
      } else {
        console.log("Status já registrado hoje.");
      }
    } else {
      await addDoc(collection(db, "presencas"), {
        alunoId,
        nomeAluno,
        aulaId,
        nomeAula,
        statusAula,
        dataHora: Timestamp.now(),
      });
      console.log("Nova presença registrada.");
    }
  } catch (error) {
    console.error("Erro ao registrar/atualizar presença:", error);
  }
};