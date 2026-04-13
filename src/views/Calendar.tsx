import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Session } from "../types";
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, Clock, MapPin, X } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "../lib/utils";

export const CalendarView: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [newSession, setNewSession] = useState({ titulo: "", descripcion: "", fecha: format(new Date(), "yyyy-MM-dd"), hora: "09:00" });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("fechaInicio", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(`${newSession.fecha}T${newSession.hora}`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h default

    const sessionData = {
      titulo: newSession.titulo,
      descripcion: newSession.descripcion,
      fechaInicio: start.toISOString(),
      fechaFin: end.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSession) {
      await updateDoc(doc(db, "sessions", editingSession.id), sessionData);
    } else {
      await addDoc(collection(db, "sessions"), {
        ...sessionData,
        creadorId: "guest",
        createdAt: new Date().toISOString(),
      });

      // News only for new sessions
      await addDoc(collection(db, "news"), {
        titulo: `Nueva sesión: ${newSession.titulo}`,
        descripcion: `Programada para el ${format(start, "d 'de' MMMM", { locale: es })}`,
        tipo: "sesion",
        referenciaId: "calendar",
        usuarioId: "guest",
        createdAt: new Date().toISOString(),
      });
    }

    setNewSession({ titulo: "", descripcion: "", fecha: format(new Date(), "yyyy-MM-dd"), hora: "09:00" });
    setEditingSession(null);
    setShowModal(false);
  };

  const handleEdit = (session: Session) => {
    const date = parseISO(session.fechaInicio);
    setEditingSession(session);
    setNewSession({
      titulo: session.titulo,
      descripcion: session.descripcion,
      fecha: format(date, "yyyy-MM-dd"),
      hora: format(date, "HH:mm"),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "sessions", id));
    setShowDeleteConfirm(null);
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight capitalize">{format(selectedDate, "MMMM yyyy", { locale: es })}</h2>
          <div className="flex gap-2">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-100 rounded-lg">←</button>
            <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-zinc-100 rounded-lg">Hoy</button>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-100 rounded-lg">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-zinc-100 border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
            <div key={d} className="bg-zinc-50 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">{d}</div>
          ))}
          {days.map((day, idx) => {
            const daySessions = sessions.filter(s => isSameDay(new Date(s.fechaInicio), day));
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "bg-white min-h-[100px] p-2 transition-colors hover:bg-zinc-50/50 cursor-pointer",
                  !isCurrentMonth && "bg-zinc-50/30 text-zinc-300",
                  isSameDay(day, selectedDate) && isCurrentMonth && "ring-1 ring-inset ring-zinc-200",
                  isToday(day) && "bg-blue-50/30"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <span className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1",
                  isToday(day) ? "bg-blue-600 text-white" : "",
                  !isCurrentMonth && "opacity-50"
                )}>
                  {format(day, "d")}
                </span>
                <div className="space-y-1">
                  {daySessions.slice(0, 2).map(s => (
                    <div key={s.id} className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded truncate font-medium text-zinc-700">
                      {s.titulo}
                    </div>
                  ))}
                  {daySessions.length > 2 && <div className="text-[10px] text-zinc-400 pl-1">+{daySessions.length - 2} más</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details & Actions */}
      <div className="space-y-6">
        <div className="p-6 border border-zinc-100 rounded-2xl bg-white shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Sesiones del día</h3>
            <button 
              onClick={() => {
                setEditingSession(null);
                setNewSession({ titulo: "", descripcion: "", fecha: format(selectedDate, "yyyy-MM-dd"), hora: "09:00" });
                setShowModal(true);
              }}
              className="p-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {sessions.filter(s => isSameDay(new Date(s.fechaInicio), selectedDate)).map(session => (
              <div key={session.id} className="group p-4 bg-zinc-50 rounded-xl border border-transparent hover:border-zinc-200 transition-all relative">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-zinc-900">{session.titulo}</h4>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEdit(session)} className="text-zinc-400 hover:text-zinc-900">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(session.id)} className="text-zinc-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                  <Clock size={12} />
                  <span>{format(new Date(session.fechaInicio), "HH:mm")} - {format(new Date(session.fechaFin), "HH:mm")}</span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{session.descripcion}</p>

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm === session.id && (
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center p-4 z-10">
                    <div className="text-center">
                      <p className="text-xs font-bold mb-3">¿Eliminar sesión?</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1 text-[10px] border border-zinc-200 rounded-lg hover:bg-zinc-50"
                        >
                          No
                        </button>
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="px-3 py-1 text-[10px] bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Sí, borrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {sessions.filter(s => isSameDay(new Date(s.fechaInicio), selectedDate)).length === 0 && (
              <div className="text-center py-8 text-zinc-400 text-sm">No hay sesiones programadas.</div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingSession ? "Editar Sesión" : "Programar Sesión"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
                <input required type="text" value={newSession.titulo} onChange={e => setNewSession({...newSession, titulo: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha</label>
                  <input required type="date" value={newSession.fecha} onChange={e => setNewSession({...newSession, fecha: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Hora</label>
                  <input required type="time" value={newSession.hora} onChange={e => setNewSession({...newSession, hora: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Descripción</label>
                <textarea rows={3} value={newSession.descripcion} onChange={e => setNewSession({...newSession, descripcion: e.target.value})} className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                  {editingSession ? "Guardar Cambios" : "Programar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
