
import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { getMutualBlockedUserIds, findUserById, toggleBlockUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { 
    NoSymbolIcon, 
    ArrowLeftIcon, 
    UserMinusIcon 
} from '@heroicons/react/24/outline';

interface BlockedUsersPageProps {
    currentUser: User;
    onNavigate: (page: Page) => void;
    refreshUser: () => void;
}

const BlockedUsersPage: React.FC<BlockedUsersPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBlockedUsers = async () => {
        setLoading(true);
        try {
            // No momento, mostramos apenas os usuários que NÓS bloqueamos para gerenciar o desbloqueio
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

    const handleUnblock = async (targetId: string) => {
        if (!window.confirm("Deseja realmente desbloquear este usuário?")) return;
        
        try {
            await toggleBlockUser(currentUser.id, targetId);
            refreshUser();
            // A lista será atualizada via useEffect devido ao currentUser
        } catch (error) {
            alert("Erro ao desbloquear usuário.");
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
                            Usuários Bloqueados
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-1">
                            Gerencie quem não pode interagir com você
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand"></div>
                    <p className="text-[10px] font-black uppercase text-gray-400 animate-pulse tracking-widest">A carregar sua lista negra...</p>
                </div>
            ) : blockedUsers.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/50 border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-12 text-center shadow-xl">
                    <div className="bg-gray-100 dark:bg-white/5 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <NoSymbolIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-black uppercase text-gray-900 dark:text-white mb-2">Tudo limpo por aqui!</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                        Você não bloqueou nenhum usuário no CyBerPhone ainda. Sua experiência está totalmente aberta e social.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {blockedUsers.map(user => (
                        <div 
                            key={user.id} 
                            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-3xl p-4 flex items-center justify-between group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-lg"
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
                                onClick={() => handleUnblock(user.id)}
                                className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 rounded-2xl transition-all active:scale-90 group/btn shadow-sm"
                                title="Desbloquear Usuário"
                            >
                                <UserMinusIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Information box */}
            <div className="mt-12 bg-brand/5 dark:bg-brand/10 border border-brand/20 rounded-3xl p-6 flex gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="h-10 w-10 bg-brand/20 rounded-2xl flex items-center justify-center shrink-0">
                   <NoSymbolIcon className="h-5 w-5 text-brand" />
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase text-brand mb-1 tracking-tight">O que acontece quando você bloqueia alguém?</h3>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold leading-relaxed uppercase opacity-80">
                        Usuários bloqueados não podem ver seu perfil, seus posts, ou enviar mensagens para você. Além disso, as publicações deles também ficam invisíveis no seu feed.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BlockedUsersPage;
