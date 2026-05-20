
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, CyberEvent } from '../types';
import { getEvents } from '../services/storageService';
import { 
  CalendarDaysIcon, 
  MapPinIcon, 
  TicketIcon, 
  UserGroupIcon, 
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import CreateEventModal from './CreateEventModal';
import { AnimatePresence } from 'motion/react';

interface EventsPageProps {
  currentUser: User;
  onNavigate?: (page: string, params?: any) => void;
}

const EventCard: React.FC<{ event: CyberEvent }> = ({ event }) => {
  const date = new Date(event.startDate).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 group transition-all hover:shadow-xl">
      <div className="relative h-48">
        <img 
          src={event.bannerUrl} 
          alt={event.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute top-4 left-4 bg-white/90 dark:bg-darkcard/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{event.category}</span>
        </div>
      </div>
      <div className="p-6">
        <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h4>
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold">{date}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <MapPinIcon className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <UserGroupIcon className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-bold">{event.attendeesCount} participantes</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ingressos desde</span>
            <span className="text-lg font-black text-blue-600 tracking-tight">
              {event.isFree ? 'Grátis' : `$${event.minPrice?.toFixed(2)}`}
            </span>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
            <TicketIcon className="h-4 w-4" /> Ver Info
          </button>
        </div>
      </div>
    </div>
  );
};

const EventsPage: React.FC<EventsPageProps> = ({ currentUser, onNavigate }) => {
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const result = await getEvents(12, isRefresh ? undefined : lastDoc);
    
    if (isRefresh) {
      setEvents(result.items);
    } else {
      setEvents(prev => [...prev, ...result.items]);
    }
    
    setLastDoc(result.lastDoc);
    setHasMore(result.hasMore);
    setLoading(false);
    setLoadingMore(false);
  }, [lastDoc]);

  useEffect(() => {
    fetchEvents(true);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchEvents(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchEvents, hasMore, loading, loadingMore]);

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-16 pt-20">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">FacePhone Events</p>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">
              Experiências <br /> <span className="text-blue-600">Reais</span>.
            </h2>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white dark:bg-darkcard p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 flex items-center gap-4 group hover:scale-105 transition-all"
          >
            <div className="p-3 bg-blue-600 text-white rounded-2xl group-hover:rotate-12 transition-transform">
              <PlusIcon className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h4 className="font-black dark:text-white text-sm uppercase tracking-tight">Criar Evento</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Divulgue seu conteúdo</p>
            </div>
          </button>
        </div>

        <div className="flex flex-col md:row items-center gap-4">
          <div className="flex-1 w-full relative group">
            <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome, local ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white dark:bg-darkcard border border-gray-100 dark:border-white/5 rounded-[2rem] shadow-sm text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
            />
          </div>
          <button 
            onClick={() => fetchEvents(true)}
            className="p-5 bg-white dark:bg-darkcard border border-gray-100 dark:border-white/5 rounded-[2rem] text-gray-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            <ArrowPathIcon className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] animate-pulse">Carregando experiências FacePhone...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-darkcard rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-white/5 p-20 text-center flex flex-col items-center">
          <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-full mb-8">
            <CalendarDaysIcon className="h-16 w-16 text-gray-200 dark:text-gray-800" />
          </div>
          <h3 className="text-2xl font-black text-gray-400 uppercase tracking-tighter mb-2">Nenhum evento encontrado</h3>
          <p className="text-gray-500 font-medium">Tente buscar por termos diferentes ou confira mais tarde.</p>
        </div>
      ) : (
        <div className="space-y-12 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          <div ref={observerTarget} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                A carregar mais eventos...
              </div>
            )}
            {!hasMore && filteredEvents.length > 0 && (
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-50">
                Você chegou ao fim dos eventos.
              </p>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateEventModal 
            currentUser={currentUser}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchEvents(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
