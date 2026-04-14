import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { V1Post } from "../types";
import { Image as ImageIcon, Plus, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export const Imagine: React.FC = () => {
  const [posts, setPosts] = useState<V1Post[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedPost, setSelectedPost] = useState<V1Post | null>(null);
  const [newPost, setNewPost] = useState({ titulo: "", contenido: "" });

  useEffect(() => {
    const q = query(collection(db, "v1imagine"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as V1Post)));
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    await addDoc(collection(db, "v1imagine"), {
      titulo: newPost.titulo,
      contenido: newPost.contenido,
      creadorId: "guest",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewPost({ titulo: "", contenido: "" });
    setShowEditor(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">Imagene Hub</h2>
          <p className="text-zinc-500 text-lg">Contenido semanal, inspiración y visión de futuro.</p>
        </div>
        <button 
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-bold hover:bg-zinc-800 transition-all shadow-lg hover:scale-105"
        >
          <Plus size={20} />
          <span>Publicar Artículo</span>
        </button>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-2xl font-bold">Nuevo Artículo</h3>
              <button onClick={() => setShowEditor(false)} className="text-zinc-500 hover:text-zinc-900 font-medium bg-zinc-100 px-4 py-2 rounded-full transition-colors">Cerrar</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-8">
              <input 
                required
                type="text" 
                placeholder="Título del artículo..."
                value={newPost.titulo}
                onChange={e => setNewPost({...newPost, titulo: e.target.value})}
                className="w-full text-5xl font-black focus:outline-none placeholder:text-zinc-100"
              />
              <textarea 
                required
                placeholder="Escribe tu historia aquí (soporta Markdown)..."
                rows={15}
                value={newPost.contenido}
                onChange={e => setNewPost({...newPost, contenido: e.target.value})}
                className="w-full text-xl focus:outline-none text-zinc-600 resize-none leading-relaxed"
              />
              <div className="flex justify-end pt-8 border-t border-zinc-100">
                <button 
                  type="submit"
                  className="bg-zinc-900 text-white px-12 py-4 rounded-full font-black text-xl hover:bg-zinc-800 transition-all shadow-xl"
                >
                  Publicar ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-10">
            <div className="max-w-3xl mx-auto px-8 h-20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ImageIcon className="text-zinc-400" size={24} />
                <span className="font-bold text-zinc-400 uppercase tracking-widest text-xs">Imagene Hub</span>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="bg-zinc-100 text-zinc-900 px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition-all"
              >
                Cerrar lectura
              </button>
            </div>
          </div>
          
          <article className="max-w-3xl mx-auto px-8 py-16">
            <header className="mb-12">
              <div className="flex items-center gap-3 text-zinc-400 text-sm font-bold uppercase tracking-widest mb-6">
                <Clock size={16} />
                <span>{format(new Date(selectedPost.createdAt), "d MMMM, yyyy", { locale: es })}</span>
              </div>
              <h1 className="text-6xl font-black tracking-tight leading-tight mb-8">{selectedPost.titulo}</h1>
              <div className="aspect-video bg-zinc-100 rounded-[2rem] overflow-hidden shadow-2xl">
                <img 
                  src={`https://picsum.photos/seed/${selectedPost.id}/1200/800`} 
                  alt={selectedPost.titulo}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </header>
            
            <div className="prose prose-zinc prose-xl max-w-none">
              <div className="text-zinc-600 leading-relaxed space-y-6">
                <ReactMarkdown>{selectedPost.contenido}</ReactMarkdown>
              </div>
            </div>
          </article>
          
          <footer className="max-w-3xl mx-auto px-8 py-16 border-t border-zinc-100">
            <div className="bg-zinc-50 rounded-3xl p-8 text-center">
              <h4 className="font-bold text-xl mb-2">¿Te ha gustado este artículo?</h4>
              <p className="text-zinc-500 mb-6">Comparte tus impresiones en el buzón de sugerencias.</p>
              <button 
                onClick={() => setSelectedPost(null)}
                className="text-zinc-900 font-bold hover:underline"
              >
                Volver al Hub
              </button>
            </div>
          </footer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {posts.map((post) => (
          <div key={post.id} className="group cursor-pointer" onClick={() => setSelectedPost(post)}>
            <div className="aspect-video bg-zinc-100 rounded-3xl mb-6 overflow-hidden relative">
              <img 
                src={`https://picsum.photos/seed/${post.id}/800/600`} 
                alt={post.titulo}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <span className="text-white font-bold flex items-center gap-2">Leer artículo <ArrowRight size={18} /></span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3">
              <Clock size={14} />
              <span>{format(new Date(post.createdAt), "d MMMM, yyyy", { locale: es })}</span>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-3 group-hover:text-zinc-600 transition-colors">{post.titulo}</h3>
            <div className="text-zinc-500 line-clamp-2 text-sm leading-relaxed mb-4">
              <ReactMarkdown>{post.contenido}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
