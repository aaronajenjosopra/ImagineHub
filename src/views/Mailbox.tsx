import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Post, Response } from "../types";
import { MessageSquare, Sparkles, Send, CheckCircle2, Clock, Plus } from "lucide-react";
import { geminiService } from "../services/geminiService";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export const Mailbox: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ titulo: "", contenido: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [iaSuggestion, setIaSuggestion] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [responses, setResponses] = useState<Record<string, Response[]>>({});

  useEffect(() => {
    const q = query(collection(db, "mailbox"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const newPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(newPosts);

      // Setup listeners for responses of each post
      newPosts.forEach(post => {
        const qResp = query(collection(db, "mailbox", post.id, "responses"), orderBy("createdAt", "asc"));
        onSnapshot(qResp, (respSnap) => {
          setResponses(prev => ({
            ...prev,
            [post.id]: respSnap.docs.map(d => ({ id: d.id, ...d.data() } as Response))
          }));
        });
      });
    });
    return () => unsub();
  }, []);

  const handleAnalyze = async () => {
    if (!newPost.titulo || !newPost.contenido) return;
    setIsAnalyzing(true);
    try {
      const result = await geminiService.suggestMailboxSolution(newPost.titulo, newPost.contenido);
      setIaSuggestion(result.solucion);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async (resolved: boolean) => {
    const postData = {
      titulo: newPost.titulo,
      contenido: newPost.contenido,
      estado: resolved ? "resuelto" : "pendiente",
      solucionIA: resolved ? iaSuggestion : null,
      creadorId: "guest",
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "mailbox"), postData);

    // News
    await addDoc(collection(db, "news"), {
      titulo: `Nuevo post en el buzón: ${newPost.titulo}`,
      descripcion: resolved ? "Resuelto automáticamente por IA." : "Pendiente de respuesta.",
      tipo: "foro",
      referenciaId: "mailbox",
      usuarioId: "guest",
      createdAt: new Date().toISOString(),
    });

    setNewPost({ titulo: "", contenido: "" });
    setIaSuggestion(null);
    setShowNewPost(false);
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;

    await addDoc(collection(db, "mailbox", postId, "responses"), {
      contenido: replyContent,
      postId,
      usuarioId: "guest",
      createdAt: new Date().toISOString(),
    });

    setReplyContent("");
    setActiveReplyId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Buzón de Colaboración</h2>
          <p className="text-zinc-500">Comparte problemas, ideas o dudas con el equipo.</p>
        </div>
        <button 
          onClick={() => setShowNewPost(true)}
          className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={20} />
          <span>Nuevo Post</span>
        </button>
      </div>

      <AnimatePresence>
        {showNewPost && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 border border-zinc-200 rounded-2xl bg-white shadow-lg space-y-4"
          >
            <input 
              type="text" 
              placeholder="Título del problema o idea..."
              value={newPost.titulo}
              onChange={e => setNewPost({...newPost, titulo: e.target.value})}
              className="w-full text-xl font-bold focus:outline-none placeholder:text-zinc-300"
            />
            <textarea 
              placeholder="Describe detalladamente..."
              rows={4}
              value={newPost.contenido}
              onChange={e => setNewPost({...newPost, contenido: e.target.value})}
              className="w-full focus:outline-none text-zinc-600 resize-none"
            />

            {iaSuggestion && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                  <Sparkles size={16} />
                  <span>Sugerencia de la IA</span>
                </div>
                <p className="text-sm text-blue-900 leading-relaxed">{iaSuggestion}</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => handlePublish(true)}
                    className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                  >
                    Aceptar y Resolver
                  </button>
                  <button 
                    onClick={() => setIaSuggestion(null)}
                    className="text-xs font-bold bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg"
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-zinc-50">
              <button 
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || !newPost.titulo || !newPost.contenido}
                className="flex items-center gap-2 text-zinc-500 hover:text-blue-600 disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Consultar IA antes de publicar
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowNewPost(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 font-medium">Cancelar</button>
                <button 
                  onClick={() => handlePublish(false)}
                  className="bg-zinc-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-zinc-800 transition-colors"
                >
                  Publicar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm hover:border-zinc-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-zinc-900">{post.titulo}</h3>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                post.estado === "resuelto" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              )}>
                {post.estado === "resuelto" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {post.estado}
              </div>
            </div>
            <p className="text-zinc-600 text-sm mb-4">{post.contenido}</p>
            
            {post.solucionIA && (
              <div className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2 text-zinc-500 font-bold text-[10px] uppercase mb-1">
                  <Sparkles size={12} /> Solución IA
                </div>
                <p className="text-sm text-zinc-700">{post.solucionIA}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
              <div className="flex items-center gap-4 text-zinc-400 text-xs">
                <span>Por {post.creadorId.slice(0, 5)}...</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}</span>
              </div>
              <button 
                onClick={() => setActiveReplyId(activeReplyId === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 text-sm font-medium"
              >
                <MessageSquare size={16} />
                {responses[post.id]?.length || 0} Respuestas
              </button>
            </div>

            {/* Responses List */}
            <AnimatePresence>
              {activeReplyId === post.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-zinc-50 space-y-4 overflow-hidden"
                >
                  <div className="space-y-3">
                    {responses[post.id]?.map((resp) => (
                      <div key={resp.id} className="bg-zinc-50 p-3 rounded-xl">
                        <p className="text-sm text-zinc-700">{resp.contenido}</p>
                        <div className="mt-2 text-[10px] text-zinc-400 flex justify-between">
                          <span>Guest</span>
                          <span>{formatDistanceToNow(new Date(resp.createdAt), { addSuffix: true, locale: es })}</span>
                        </div>
                      </div>
                    ))}
                    {(!responses[post.id] || responses[post.id].length === 0) && (
                      <p className="text-xs text-zinc-400 text-center py-2">No hay respuestas aún.</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Escribe una respuesta..."
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReply(post.id)}
                      className="flex-1 bg-zinc-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-zinc-900/5"
                    />
                    <button 
                      onClick={() => handleReply(post.id)}
                      className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

const Loader2 = ({ className, size = 20 }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={cn("animate-spin", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
