
import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { getMutualBlockedUserIds, findUserById, toggleBlockUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { useDialog } from '../services/DialogContext';
import { 
    NoSymbolIcon, 
    ArrowLeftIcon, 
    UserMinusIcon,
    CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface BlockedUsersPageProps {
    currentUser: User;
    onNavigate: (page: Page) => void;
    refreshUser: () => void;
}

const BlockedUsersPage: React.FC<BlockedUsersPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { showConfirm, showSuccess, showError } = useDialog();

    const fetchBlockedUsers = async () => {
        setLoading(true);
        try {
            const blockedIds = currentUser.blockedUserIds || [];
            const users = await Promise.all(blockedIds.map(id => findUserById(id)));
            setBlockedUsers(users.filter(u => !!u) as User[]);
        } catch (error) {
            console.error("[STORAGE] Erro ao carregar usuários bloqueados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlockedUsers();
    }, [currentUser.blockedUserIds]);

    const handleUnblock = async (targetId: string, userName: string) => {
        const confirmed = await showConfirm(`Deseja realmente desbloquear ${userName}? Ele poderá ver seu perfil e enviar mensagens novamente.`, {
            title: 'Confirmar Desbloqueio',
            confirmText: 'Desbloquear',
            cancelText: 'Manter Bloqueado'
        });

        if (!confirmed) return;
        
        setActionLoading(targetId);
        try {
            await toggleBlockUser(currentUser.id, targetId);
            refreshUser();
            showSuccess(`${userName} foi desbloqueado com sucesso!`);
        } catch (error) {
            showError("Não foi possível desbloquear o usuário agora. Tente novamente mais tarde.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => onNavigate('settings')}
                        className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-500 hover:text-brand transition-all active:scale-95"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white flex items-center gap-2">
                            <NoSymbolIcon className="h-7 w-7 text-red-500" />
                            Lista de Bloqueio
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-1">
                            Usuários que não podem interagir com você
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand"></div>
                    <p className="text-[10px] font-black uppercase text-gray-400 animate-pulse tracking-widest">Sincronizando com o servidor...</p>
                </div>
            ) : blockedUsers.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/50 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-12 text-center shadow-xl">
                    <div className="bg-gray-100 dark:bg-white/5 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="h-10 w-10 text-brand/40" />
                    </div>
                    <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-2">Nenhum Bloqueio Ativo</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                        Sua lista de bloqueio está vazia. Todos os usuários podem ver seu perfil e interagir com suas postagens.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {blockedUsers.map(user => (
                        <div 
                            key={user.id} 
                            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-3xl p-4 flex items-center justify-between group hover:shadow-2xl transition-all duration-300 shadow-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img 
                                        src={user.profilePicture || DEFAULT_PROFILE_PIC} 
                                        alt={user.firstName}
                                        className="h-14 w-14 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-brand/30 transition-all border border-gray-100 dark:border-white/10"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white dark:border-zinc-900">
                                        <NoSymbolIcon className="h-2 w-2 text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-brand transition-colors line-clamp-1">
                                        {user.firstName} {user.lastName}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest line-clamp-1">
                                        @{user.email.split('@')[0]}
                                    </span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleUnblock(user.id, `${user.firstName} ${user.lastName}`)}
                                disabled={actionLoading === user.id}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                                    ${actionLoading === user.id 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-500/20'}
                                `}
                            >
                                {actionLoading === user.id ? (
                                    <>
                                        <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent animate-spin rounded-full"></div>
                                        Desbloqueando...
                                    </>
                                ) : (
                                    <>
                                        <UserMinusIcon className="h-4 w-4" />
                                        Desbloquear
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Information box */}
            <div className="mt-12 bg-zinc-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6 flex gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="h-10 w-10 bg-gray-200 dark:bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                   <NoSymbolIcon className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase text-gray-900 dark:text-white mb-1 tracking-tight">Política de Privacidade de Bloqueio</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed uppercase opacity-80">
                        Usuários bloqueados não são notificados do bloqueio, mas eles não poderão encontrar seu perfil, ver seus posts ou enviar mensagens. Ao desbloquear, o histórico de mensagens anterior permanecerá intacto.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BlockedUsersPage;
