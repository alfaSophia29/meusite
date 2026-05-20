
import React, { useState, useRef } from 'react';
import { User, CyberEvent } from '../types';
import { createEvent, uploadFile } from '../services/storageService';
import { 
  XMarkIcon, 
  CalendarDaysIcon, 
  MapPinIcon, 
  TagIcon, 
  PhotoIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ArrowRightIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';

interface CreateEventModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ currentUser, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    location: '',
    category: 'Workshop',
    type: 'PRESENTIAL' as 'ONLINE' | 'PRESENTIAL',
    isFree: true,
    minPrice: 0,
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Workshop', 'Conferência', 'Show', 'Esporte', 'Tecnologia', 
    'Educação', 'Social', 'Gaming', 'Outros'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerFile && !previewUrl) {
      alert('Por favor, adicione um banner para o seu evento.');
      return;
    }

    setLoading(true);
    try {
      let bannerUrl = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop';
      
      if (bannerFile) {
        bannerUrl = await uploadFile(bannerFile, 'events');
      }

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
      
      const newEvent: CyberEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        creatorId: currentUser.id,
        creatorName: `${currentUser.firstName} ${currentUser.lastName}`,
        title: formData.title,
        description: formData.description,
        startDate: startDateTime,
        type: formData.type,
        attendeesCount: 1,
        attendees: [currentUser.id],
        bannerUrl,
        location: formData.location,
        category: formData.category,
        isFree: formData.isFree,
        minPrice: formData.isFree ? 0 : formData.minPrice,
      };

      await createEvent(newEvent);
      onSuccess();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Erro ao criar evento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-darkcard rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <div>
            <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Crie Algo Novo</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Organizar Evento</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all hover:rotate-90"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Banner Upload */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative h-48 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
              previewUrl ? 'border-transparent' : 'border-gray-200 dark:border-white/10 hover:border-blue-500 bg-gray-50 dark:bg-black/20'
            }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-[1.8rem]" />
                <div className="absolute inset-0 bg-black/40 rounded-[1.8rem] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest border border-white/30">
                    Trocar Banner
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-blue-500/10 rounded-3xl mb-3">
                  <PhotoIcon className="h-8 w-8 text-blue-600" />
                </div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Adicionar Banner do Evento</span>
                <p className="text-[9px] text-gray-500 mt-1">Recomendado: 1200x600px</p>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Título do Evento</label>
              <div className="relative group">
                <TagIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Workshop de Design Moderno"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Categoria</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none appearance-none transition-all"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Descrição</label>
            <textarea 
              required
              rows={3}
              placeholder="Conte mais sobre o que vai rolar..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Data</label>
              <div className="relative group">
                <CalendarDaysIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  required
                  type="date" 
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Horário</label>
              <div className="relative group">
                <GlobeAltIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  required
                  type="time" 
                  value={formData.startTime}
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                  className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Localização / Link</label>
              <div className="relative group">
                <MapPinIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  required
                  type="text" 
                  placeholder={formData.type === 'ONLINE' ? 'Link da sala / plataforma' : 'Endereço completo'}
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-blue-500/30 rounded-2xl shadow-sm text-sm font-bold dark:text-white focus:outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-4">Tipo</label>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-black/20 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'PRESENTIAL'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.type === 'PRESENTIAL' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  Presencial
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'ONLINE'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.type === 'ONLINE' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  Online
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <h4 className="font-black dark:text-white text-sm uppercase tracking-tight">Valor da Entrada</h4>
              </div>
              <div className="flex bg-white dark:bg-darkbg p-1 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isFree: true})}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.isFree ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                >
                  Grátis
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isFree: false})}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.isFree ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                >
                  Pago
                </button>
              </div>
            </div>
            
            {!formData.isFree && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="relative overflow-hidden"
              >
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 50.00"
                  value={formData.minPrice}
                  onChange={e => setFormData({...formData, minPrice: parseFloat(e.target.value) || 0})}
                  className="w-full px-6 py-4 bg-white dark:bg-black/40 border border-blue-200 dark:border-blue-500/20 rounded-2xl text-sm font-bold dark:text-white focus:outline-none"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600">KZ</span>
              </motion.div>
            )}
          </div>
        </form>

        <div className="p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
          <button 
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:scale-100 text-white py-5 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                Criando Experiência...
              </>
            ) : (
              <>
                Publicar Evento <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateEventModal;
