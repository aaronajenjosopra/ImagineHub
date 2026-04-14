import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Initiative } from "../types";
import { Rocket, Plus, Search, Calendar, Trash2, Pencil, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const Initiatives: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInit, setEditingInit] = useState<Initiative | null>(null);
  const [newInit, setNewInit] = useState({ nombre: "", descripcion: "", responsable: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "initiatives"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setInitiatives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const initData = {
      nombre: newInit.nombre,
      descripcion: newInit.descripcion,
      responsable: newInit.responsable,
      updatedAt: new Date().toISOString(),
    };

    if (editingInit) {
      await updateDoc(doc(db, "initiatives", editingInit.id), initData);
    } else {
      const docRef = await addDoc(collection(db, "initiatives"), {
        ...initData,
        createdBy: "guest",
        createdAt: new Date().toISOString(),
      });

      // Create news
      await addDoc(collection(db, "news"), {
        titulo: `Nueva iniciativa: ${newInit.nombre}`,
        descripcion: `Se ha lanzado una nueva iniciativa transversal.`,
        tipo: "iniciativa",
        referenciaId: docRef.id,
        usuarioId: "guest",
        createdAt: new Date().toISOString(),
      });
    }

    setNewInit({ nombre: "", descripcion: "", responsable: "" });
    setEditingInit(null);
    setShowModal(false);
  };

  const handleEdit = (init: Initiative) => {
    setEditingInit(init);
    setNewInit({
      nombre: init.nombre,
      descripcion: init.descripcion,
      responsable: init.responsable || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "initiatives", id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Iniciativas</h2>
          <p className="text-zinc-500">Proyectos estratégicos de la compañía.</p>
        </div>
        <button 
          onClick={() => {
            setEditingInit(null);
            setNewInit({ nombre: "", descripcion: "", responsable: "" });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={20} />
          <span>Nueva Iniciativa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initiatives.map((init) => (
          <div 
            key={init.id} 
            className="group p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:shadow-md hover:border-zinc-200 transition-all flex flex-col h-full relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-xl group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                  <Rocket size={24} />
                </div>
                <h3 className="text-lg font-bold leading-tight">{init.nombre}</h3>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleEdit(init)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(init.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <Link to={`/initiatives/${init.id}`} className="flex-1">
              <p className="text-zinc-500 text-sm line-clamp-3 mb-4">{init.descripcion}</p>
              
              {init.responsable && (
                <div className="flex items-center gap-2 text-xs text-zinc-600 mb-4 bg-zinc-50 px-2 py-1.5 rounded-lg w-fit">
                  <User size={14} className="text-zinc-400" />
                  <span className="font-medium">Responsable:</span>
                  <span>{init.responsable}</span>
                </div>
              )}
            </Link>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-50 text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{format(new Date(init.createdAt), "d MMM, yyyy", { locale: es })}</span>
              </div>
              <Link to={`/initiatives/${init.id}`} className="font-medium text-zinc-900 hover:underline">
                Ver detalles →
              </Link>
            </div>

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm === init.id && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex items-center justify-center p-6 z-10 animate-in fade-in zoom-in duration-200">
                <div className="text-center">
                  <p className="font-bold text-zinc-900 mb-1">¿Eliminar iniciativa?</p>
                  <p className="text-xs text-zinc-500 mb-4">Esta acción no se puede deshacer.</p>
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleDelete(init.id)}
                      className="px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingInit ? "Editar Iniciativa" : "Crear Iniciativa"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-zinc-700 mb-1">Responsable</label>
                <input 
                  type="text" 
                  value={newInit.responsable}
                  onChange={e => setNewInit({...newInit, responsable: e.target.value})}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900"
                  placeholder="Nombre del responsable..."
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
                  {editingInit ? "Guardar Cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
