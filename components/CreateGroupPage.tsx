
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ChatConversation, ChatType, GroupTheme, GlobalSettings } from '../types';
import { getUsers, createGroup, findUserById, getGlobalSettings } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { useDialog } from '../services/DialogContext';
import { 
  ArrowLeftIcon, 
  UserGroupIcon, 
  MagnifyingGlassIcon, 
  CheckIcon, 
  XMarkIcon,
  SparklesIcon,
  CameraIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PhotoIcon
} from '@heroicons/react/24/solid';

interface CreateGroupPageProps {
  currentUser: User;
  onNavigate: (page: any) => void;
}

const THEMES: { id: GroupTheme; label: string; color: string }[] = [
  { id: 'blue', label: 'Azul Telegram', color: 'bg-blue-500' },
  { id: 'green', label: 'Verde Natureza', color: 'bg-emerald-500' },
  { id: 'black', label: 'Dark OLED', color: 'bg-black' },
  { id: 'orange', label: 'Laranja CyBer', color: 'bg-orange-500' }
];

const CreateGroupPage: React.FC<CreateGroupPageProps> = ({ currentUser, onNavigate }) => {
  const { showAlert, showError } = useDialog();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<GroupTheme>('blue');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings().then(setSettings);
  }, []);
  
  // Imagem
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadFollowers = async () => {
      const allUsers = await getUsers(currentUser);
      // Sugere apenas usuários que seguem o usuário atual
      const myFollowersList = currentUser.followers || [];
      const filtered = allUsers.filter(u => myFollowersList.includes(u.id));
      setFollowers(filtered);
    };
    loadFollowers();
  }, [currentUser.id, currentUser.followers]);

  const filteredFollowers = useMemo(() => {
    return followers.filter(f => 
      `${f.firstName} ${f.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [followers, searchTerm]);

  const toggleMember = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setGroupImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showAlert("Defina um nome para o grupo.");
      return;
    }
    
    // Para grupos privados, exigir membros? Depende. Vamos deixar opcional, pode criar grupo sozinho.
    // if (selectedMembers.length === 0) { ... }

    const fee = settings?.groupCreationFee || 0;
    if (fee > (currentUser.balance || 0)) {
      showAlert(`Saldo insuficiente para pagar a taxa de criação de grupo ($${fee.toFixed(2)}).`, { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const success = await createGroup(
          groupName.trim(), 
          selectedMembers, 
          currentUser.id, 
          description, 
          selectedTheme,
          groupImageFile || undefined,
          isPublic
      );
      if (success) {
        onNavigate('chat');
        showAlert("Comunidade criada com sucesso!", { type: 'success' });
      } else {
        showAlert("Erro ao criar comunidade. Verifique seu saldo ou conexão.", { type: 'error' });
      }
    } catch (error) {
      console.error(error);
      showError("Erro ao criar grupo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-5xl animate-fade-in">
       <button 
         onClick={() => onNavigate('profile')}
         className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-8 transition-colors"
       >
          <ArrowLeftIcon className="h-4 w-4" /> Cancelar
       </button>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Detalhes do Grupo */}
          <div className="lg:col-span-7">
             <div className="bg-white dark:bg-darkcard rounded-[3rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
                <div className="p-8 md:p-12 space-y-8">
                   
                   {/* Cabeçalho e Upload de Imagem */}
                   <div className="text-center">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative inline-block mb-6 cursor-pointer group"
                      >
                         <div className="w-28 h-28 md:w-36 md:h-36 bg-gray-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center border-4 border-white dark:border-darkcard shadow-xl overflow-hidden transition-all group-hover:border-blue-500">
                            {groupImagePreview ? (
                                <img src={groupImagePreview} className="w-full h-full object-cover" alt="Group Preview" />
                            ) : (
                                <CameraIcon className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            )}
                         </div>
                         <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-darkcard">
                            <PhotoIcon className="h-4 w-4" />
                         </div>
                         <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black dark:text-white uppercase tracking-tighter">Criar Comunidade</h2>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Personalize seu espaço no CyBerPhone</p>
                   </div>

                   <div className="space-y-6">
                      {/* Nome */}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome do Grupo</label>
                         <input 
                           type="text" 
                           value={groupName}
                           onChange={e => setGroupName(e.target.value)}
                           placeholder="Ex: Clube de IA & Tech"
                           className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl outline-none font-black text-lg dark:text-white border-2 border-transparent focus:border-blue-600 transition-all shadow-inner"
                         />
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Descrição</label>
                         <textarea 
                           value={description}
                           onChange={e => setDescription(e.target.value)}
                           placeholder="Descreva o propósito da comunidade..."
                           className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl outline-none font-medium text-sm dark:text-white h-24 resize-none border-2 border-transparent focus:border-blue-600 transition-all"
                         />
                      </div>

                      {/* Privacidade */}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Privacidade</label>
                         <div className="flex gap-3">
                            <button 
                              type="button"
                              onClick={() => setIsPublic(false)}
                              className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all ${!isPublic ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-600 text-blue-600' : 'bg-white dark:bg-white/5 border-transparent text-gray-400'}`}
                            >
                               <LockClosedIcon className="h-5 w-5" />
                               <span className="font-black text-[10px] uppercase">Privado</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setIsPublic(true)}
                              className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all ${isPublic ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-600 text-blue-600' : 'bg-white dark:bg-white/5 border-transparent text-gray-400'}`}
                            >
                               <GlobeAltIcon className="h-5 w-5" />
                               <span className="font-black text-[10px] uppercase">Público</span>
                            </button>
                         </div>
                         <p className="text-[9px] text-gray-400 px-4 pt-1">
                            {isPublic ? 'Qualquer pessoa pode encontrar e entrar no grupo.' : 'Somente convidados podem acessar o grupo.'}
                         </p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Coluna Direita: Membros e Tema */}
          <div className="lg:col-span-5 space-y-8">
             
             {/* Seleção de Membros */}
             <div className="bg-white dark:bg-darkcard rounded-[3rem] p-8 shadow-xl border border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5 text-blue-600" /> Membros
                   </h3>
                   <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black">{selectedMembers.length}</span>
                </div>

                <div className="relative mb-4">
                   <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                     type="text" 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     placeholder="Buscar pessoas..."
                     className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-xs dark:text-white"
                   />
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                   {filteredFollowers.length === 0 ? (
                     <div className="p-8 text-center text-gray-400 font-black text-[9px] uppercase border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                        Nenhum usuário encontrado
                     </div>
                   ) : (
                     filteredFollowers.map(user => (
                        <div 
                          key={user.id}
                          onClick={() => toggleMember(user.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                            selectedMembers.includes(user.id) 
                             ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/30' 
                             : 'bg-white dark:bg-white/5 border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                          }`}
                        >
                           <div className="flex items-center gap-3">
                              <img src={user.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 rounded-xl object-cover" />
                              <div className="min-w-0">
                                 <p className="font-black text-[10px] dark:text-white uppercase truncate max-w-[120px]">{user.firstName} {user.lastName}</p>
                                 <p className="text-[8px] text-gray-400 truncate">@{user.id.slice(0,8)}</p>
                              </div>
                           </div>
                           <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${selectedMembers.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-200 dark:border-white/20'}`}>
                              {selectedMembers.includes(user.id) && <CheckIcon className="h-3 w-3 text-white" />}
                           </div>
                        </div>
                     ))
                   )}
                </div>
             </div>

             {/* Identidade Visual */}
             <div className="bg-white dark:bg-darkcard rounded-[3rem] p-8 shadow-xl border border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
                   <PaintBrushIcon className="h-5 w-5 text-purple-600" /> Tema
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                   {THEMES.map(theme => (
                     <button 
                       key={theme.id}
                       onClick={() => setSelectedTheme(theme.id)}
                       className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedTheme === theme.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-50 dark:border-white/5 hover:border-gray-200'}`}
                     >
                        <div className={`w-8 h-8 rounded-full ${theme.color} shadow-md flex items-center justify-center`}>
                           {selectedTheme === theme.id && <CheckIcon className="h-4 w-4 text-white" />}
                        </div>
                        <span className={`text-[9px] font-black uppercase ${selectedTheme === theme.id ? 'text-blue-600' : 'text-gray-400'}`}>{theme.label}</span>
                     </button>
                   ))}
                </div>
                
                <button 
                  onClick={handleCreate}
                  disabled={loading || !groupName.trim()}
                  className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                    loading || !groupName.trim()
                     ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                     : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                   {loading ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                   ) : (
                     <><SparklesIcon className="h-5 w-5 text-yellow-400" /> Criar Grupo</>
                   )}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default CreateGroupPage;
