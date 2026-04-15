import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot, collectionGroup, where } from "firebase/firestore";
import { db } from "../firebase";
import { News, Initiative, Task, Session } from "../types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Rocket, CheckCircle2, MessageSquare, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

const NewsIcon = ({ type }: { type: News["tipo"] }) => {
  switch (type) {
    case "iniciativa": return <Rocket size={18} className="text-blue-500" />;
    case "tarea": return <CheckCircle2 size={18} className="text-green-500" />;
    case "foro": return <MessageSquare size={18} className="text-purple-500" />;
    case "sesion": return <CalendarIcon size={18} className="text-amber-500" />;
    default: return null;
  }
};

export const Dashboard: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [latestInitiatives, setLatestInitiatives] = useState<Initiative[]>([]);
  const [activeInitiativesCount, setActiveInitiativesCount] = useState<number>(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(0);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);
  const [upcomingSessionsCount, setUpcomingSessionsCount] = useState<number>(0);

  useEffect(() => {
    const qNews = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(10));
    const unsubNews = onSnapshot(qNews, (snap) => {
      setNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    });

    const qLatestInit = query(collection(db, "initiatives"), orderBy("createdAt", "desc"), limit(3));
    const unsubLatestInit = onSnapshot(qLatestInit, (snap) => {
      setLatestInitiatives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative)));
    });

    // Count active initiatives (treating missing estado as active)
    const unsubActiveInit = onSnapshot(collection(db, "initiatives"), (snap) => {
      const activeCount = snap.docs.filter(doc => doc.data().estado !== "closed").length;
      setActiveInitiativesCount(activeCount);
    });

    // Count active projects (treating missing estado as active)
    const unsubActiveProj = onSnapshot(collection(db, "projects"), (snap) => {
      const activeCount = snap.docs.filter(doc => doc.data().estado !== "closed").length;
      setActiveProjectsCount(activeCount);
    });

    // Count in-progress tasks across all initiatives using collectionGroup
    const qTasks = query(
      collectionGroup(db, "tasks"), 
      where("estado", "==", "in_progress")
    );
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setActiveTasksCount(snap.size);
    });

    // Count upcoming sessions
    const now = new Date().toISOString();
    const qSessions = query(
      collection(db, "sessions"),
      where("fechaInicio", ">=", now)
    );
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setUpcomingSessionsCount(snap.size);
    });

    return () => {
      unsubNews();
      unsubLatestInit();
      unsubActiveInit();
      unsubActiveProj();
      unsubTasks();
      unsubSessions();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Stats & Initiatives */}
        <div className="md:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">Últimas Iniciativas</h2>
              <Link to="/initiatives" className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latestInitiatives.map((init) => (
                <Link 
                  key={init.id} 
                  to={`/initiatives/${init.id}`}
                  className="p-5 border border-zinc-100 rounded-xl hover:border-zinc-300 transition-all bg-white shadow-sm group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Rocket size={20} />
                    </div>
                    <h3 className="font-bold text-zinc-900">{init.nombre}</h3>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{init.descripcion}</p>
                  <div className="text-xs text-zinc-400">
                    Creada {formatDistanceToNow(new Date(init.createdAt), { addSuffix: true, locale: es })}
                  </div>
                </Link>
              ))}
              {latestInitiatives.length === 0 && (
                <div className="col-span-2 p-8 border border-dashed border-zinc-200 rounded-xl text-center text-zinc-500">
                  No hay iniciativas activas. ¡Crea la primera!
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4">Actividad Reciente</h2>
            <div className="space-y-4">
              {news.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  <div className="mt-1">
                    <NewsIcon type={item.tipo} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">{item.titulo}</p>
                    <p className="text-sm text-zinc-500">{item.descripcion}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </motion.div>
              ))}
              {news.length === 0 && (
                <div className="p-8 text-center text-zinc-500">Sin actividad reciente.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Quick Actions / Summary */}
        <div className="space-y-8">
          <div className="p-6 bg-zinc-900 rounded-2xl text-white shadow-xl">
            <h3 className="text-lg font-bold mb-2">Estado de la Compañía</h3>
            <p className="text-zinc-400 text-sm mb-6">Resumen rápido de lo que está pasando hoy.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Iniciativas activas</span>
                <span className="font-bold">{activeInitiativesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Proyectos activos</span>
                <span className="font-bold">{activeProjectsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Tareas en curso</span>
                <span className="font-bold">{activeTasksCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Próximas sesiones</span>
                <span className="font-bold">{upcomingSessionsCount}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm">
            <h3 className="font-bold mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/mailbox" className="p-3 bg-zinc-50 rounded-lg text-center hover:bg-zinc-100 transition-colors">
                <MessageSquare size={20} className="mx-auto mb-1 text-purple-600" />
                <span className="text-xs font-medium">Buzón</span>
              </Link>
              <Link to="/calendar" className="p-3 bg-zinc-50 rounded-lg text-center hover:bg-zinc-100 transition-colors">
                <CalendarIcon size={20} className="mx-auto mb-1 text-amber-600" />
                <span className="text-xs font-medium">Calendario</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
