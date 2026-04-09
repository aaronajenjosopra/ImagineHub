import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Initiative } from "../types";
import { Rocket, Plus, Search, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Initiatives: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newInit, setNewInit] = useState({ nombre: "", descripcion: "" });

  useEffect(() => {
    const q = query(collection(db, "initiatives"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setInitiatives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative)));
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const initData = {
      nombre: newInit.nombre,
      descripcion: newInit.descripcion,
      createdBy: "guest",
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "initiatives"), initData);

    // Create news
    await addDoc(collection(db, "news"), {
      titulo: `Nueva iniciativa: ${newInit.nombre}`,
      descripcion: `Se ha lanzado una nueva iniciativa transversal.`,
      tipo: "iniciativa",
      referenciaId: docRef.id,
      usuarioId: "guest",
      createdAt: new Date().toISOString(),
    });

    setNewInit({ nombre: "", descripcion: "" });
    setShowModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Iniciativas</h2>
          <p className="text-zinc-500">Proyectos estratégicos de la compañía.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={20} />
          <span>Nueva Iniciativa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initiatives.map((init) => (
          <Link 
            key={init.id} 
            to={`/initiatives/${init.id}`}
            className="group p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-zinc-200 transition-all flex flex-col h-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <Rocket size={24} />
              </div>
              <h3 className="text-lg font-bold leading-tight">{init.nombre}</h3>
            </div>
            <p className="text-zinc-500 text-sm line-clamp-3 mb-6 flex-1">{init.descripcion}</p>
            <div className="flex items-center justify-between pt-4 border-t border-zinc-50 text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{format(new Date(init.createdAt), "d MMM, yyyy", { locale: es })}</span>
              </div>
              <span className="font-medium text-zinc-900">Ver detalles →</span>
            </div>
          </Link>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Crear Iniciativa</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  value={newInit.nombre}
                  onChange={e => setNewInit({...newInit, nombre: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Ej: Expansión Latam 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción</label>
                <textarea 
                  required
                  rows={4}
                  value={newInit.descripcion}
                  onChange={e => setNewInit({...newInit, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Describe los objetivos y alcance..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
