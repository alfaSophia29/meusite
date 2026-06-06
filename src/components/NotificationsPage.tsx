import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Notification, User, Post, NotificationType, Page, CallType } from '../types';
import { getNotificationsForUser, findUserById, getPosts, toggleFollowUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { HeartIcon, ChatBubbleOvalLeftIcon, UserPlusIcon, CurrencyDollarIcon, StarIcon, EnvelopeIcon, RocketLaunchIcon, ShareIcon, UserGroupIcon, PhoneXMarkIcon, TrophyIcon } from '@heroicons/react/24/solid';

interface NotificationsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const timeAgo = (timestamp: number): string => {
  const now = new Date();
  const secondsPast = (now.getTime() - timestamp) / 1000;

  if (secondsPast < 60) return `${Math.round(secondsPast)}s atrás`;
  if (secondsPast < 3600) return `${Math.round(secondsPast / 60)}m atrás`;
  if (secondsPast <= 86400) return `${Math.round(secondsPast / 3600)}h atrás`;
  const days = Math.round(secondsPast / 86400);
  if (days <= 7) return `${days}d atrás`;
  return new Date(timestamp).toLocaleDateString();
};

const NotificationItem: React.FC<{ notification: Notification; onNavigate: Function; refreshUser: Function; currentUser: User; allPosts: Post[] }> = ({ notification, onNavigate, refreshUser, currentUser, allPosts }) => {
  const [actor, setActor] = useState<User | null>(null);
  
  useEffect(() => {
    const fetchActor = async () => {
      const user = await findUserById(notification.actorId);
      setActor(user || null);
    };
    fetchActor();
  }, [notification.actorId]);

  const post = notification.postId ? allPosts.find(p => p.id === notification.postId) : null;
  const isFollowingActor = actor && currentUser.followedUsers.includes(actor.id);

  if (!actor) return null;

  const handleFollowToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFollowUser(currentUser.id, actor.id);
    refreshUser();
  };

  const handleNavigation = () => {
    if (notification.type === NotificationType.MESSAGE) {
      onNavigate('chat');
    } else if (notification.postId && post) {
      onNavigate('feed'); 
    } else if (notification.type === NotificationType.NEW_FOLLOWER) {
      onNavigate('profile', { userId: actor.id });
    } else if (notification.type === NotificationType.GROUP_POST || notification.type === NotificationType.INDICATION) {
      if (notification.postId) onNavigate('feed');
    } else if (notification.type === NotificationType.PRO_GOAL_ACHIEVED) {
      onNavigate('manage-store');
    }
  };

  const renderIcon = () => {
    switch (notification.type) {
      case NotificationType.LIKE: return <HeartIcon className="h-6 w-6 text-white bg-red-500 rounded-full p-1" />;
      case NotificationType.COMMENT: return <ChatBubbleOvalLeftIcon className="h-6 w-6 text-white bg-blue-500 rounded-full p-1" />;
      case NotificationType.NEW_FOLLOWER: return <UserPlusIcon className="h-6 w-6 text-white bg-green-500 rounded-full p-1" />;
      case NotificationType.AFFILIATE_SALE: return <CurrencyDollarIcon className="h-6 w-6 text-white bg-yellow-500 rounded-full p-1" />;
      case NotificationType.REACTION: return <StarIcon className="h-6 w-6 text-white bg-purple-500 rounded-full p-1" />;
      case NotificationType.MESSAGE: return <EnvelopeIcon className="h-6 w-6 text-white bg-indigo-500 rounded-full p-1" />;
      case NotificationType.NEW_POST: return <RocketLaunchIcon className="h-6 w-6 text-white bg-orange-500 rounded-full p-1" />;
      case NotificationType.INDICATION: return <ShareIcon className="h-6 w-6 text-white bg-blue-600 rounded-full p-1" />;
      case NotificationType.GROUP_POST: return <UserGroupIcon className="h-6 w-6 text-white bg-blue-600 rounded-full p-1" />;
      case NotificationType.MISSED_CALL: return <PhoneXMarkIcon className="h-6 w-6 text-white bg-red-600 rounded-full p-1" />;
      case NotificationType.PRO_GOAL_ACHIEVED: return <TrophyIcon className="h-6 w-6 text-white bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full p-1 shadow-md animate-bounce" />;
      case NotificationType.WALLET_TRANSFER: return <CurrencyDollarIcon className="h-6 w-6 text-white bg-blue-600 rounded-full p-1 shadow-md" />;
      default: return null;
    }
  };

  const renderMessage = () => {
    const actorName = <strong className="font-semibold">{`${actor.firstName} ${actor.lastName}`}</strong>;
    switch (notification.type) {
      case NotificationType.LIKE: return <>{actorName} curtiu sua publicação.</>;
      case NotificationType.COMMENT: return <>{actorName} comentou em sua publicação.</>;
      case NotificationType.NEW_FOLLOWER: return <>{actorName} começou a seguir você.</>;
      case NotificationType.AFFILIATE_SALE: return <>Parabéns! Você ganhou uma comissão pela venda de um produto indicado por {actorName}.</>;
      case NotificationType.REACTION: return <>{actorName} reagiu à sua publicação.</>;
      case NotificationType.MESSAGE: return <>{actorName} enviou uma nova mensagem.</>;
      case NotificationType.NEW_POST: return <>{actorName} publicou um novo conteúdo. Confira agora!</>;
      case NotificationType.INDICATION: return <>{actorName} indicou uma aula ou conteúdo para você.</>;
      case NotificationType.GROUP_POST: return <>{actorName} publicou no grupo {notification.groupName}.</>;
      case NotificationType.MISSED_CALL: return <>{actorName} ligou para você ({notification.callType === CallType.VIDEO ? 'Vídeo' : 'Voz'}).</>;
      case NotificationType.PRO_GOAL_ACHIEVED: return <>Parabéns! Você alcançou {notification.goalPercentage || 50}% da sua meta mensal de vendas estipulada!</>;
      case NotificationType.WALLET_TRANSFER: return <>{actorName} enviou uma transferência de saldo para o seu saldo digital.</>;
      default: return 'Nova notificação.';
    }
  };

  return (
    <div onClick={handleNavigation} className="flex items-center p-3 space-x-4 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200">
      <div className="relative">
        <img src={actor.profilePicture || DEFAULT_PROFILE_PIC} alt={actor.firstName} className="w-12 h-12 rounded-full object-cover" />
        <div className="absolute -bottom-1 -right-1">{renderIcon()}</div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800 dark:text-gray-200">{renderMessage()}</p>
        <span className="text-xs text-gray-500">{timeAgo(notification.timestamp)}</span>
      </div>
      {post && post.imageUrl && (
        <img src={post.imageUrl} alt="Post thumbnail" className="w-12 h-12 object-cover rounded-md" />
      )}
      {notification.type === NotificationType.NEW_FOLLOWER && (
        <button onClick={handleFollowToggle} className={`px-3 py-1 text-sm font-semibold rounded-full ${isFollowingActor ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
          {isFollowingActor ? 'Seguindo' : 'Seguir de volta'}
        </button>
      )}
    </div>
  );
};

const NotificationsPage: React.FC<NotificationsPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const notificationsRes = await getNotificationsForUser(currentUser.id, 20, isRefresh ? undefined : lastDoc);
      const userNotifications = notificationsRes.items;
      
      if (isRefresh) {
        setNotifications(userNotifications);
        const postsRes = await getPosts(undefined, 50);
        setAllPosts(postsRes.items);
      } else {
        setNotifications(prev => [...prev, ...userNotifications]);
      }
      
      setLastDoc(notificationsRes.lastDoc);
      setHasMore(notificationsRes.hasMore);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser.id, lastDoc]);

  useEffect(() => {
    fetchData(true);
  }, [currentUser.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchData(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchData, hasMore, loading, loadingMore]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      "Hoje": [],
      "Esta Semana": [],
      "Este Mês": [],
      "Mais Antigas": [],
    };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = today - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = today - 30 * 24 * 60 * 60 * 1000;

    notifications.forEach(n => {
      if (n.timestamp >= today) groups["Hoje"].push(n);
      else if (n.timestamp >= oneWeekAgo) groups["Esta Semana"].push(n);
      else if (n.timestamp >= oneMonthAgo) groups["Este Mês"].push(n);
      else groups["Mais Antigas"].push(n);
    });

    return groups;
  }, [notifications]);

  if (loading) {
    return <div className="p-8 text-center dark:text-gray-400">Carregando notificações...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-16 pb-20 md:pb-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 border-b pb-3 border-gray-200 dark:border-white/10">Notificações</h2>
      {notifications.length === 0 ? (
        <div className="text-center p-10 bg-white dark:bg-darkcard rounded-2xl shadow-sm border border-gray-200 dark:border-white/10">
          <p className="text-xl text-gray-600 dark:text-gray-400">Você não tem notificações.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-xl p-4 md:p-6 border border-gray-100 dark:border-white/5 space-y-6">
          {Object.entries(groupedNotifications).map(([groupName, groupNotifications]: [string, Notification[]]) =>
            groupNotifications.length > 0 && (
              <div key={groupName}>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 px-2">{groupName}</h3>
                <div className="space-y-2">
                  {groupNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onNavigate={onNavigate}
                      refreshUser={refreshUser}
                      currentUser={currentUser}
                      allPosts={allPosts}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
      <div ref={observerTarget} className="h-10 mt-10">
        {loadingMore && (
           <div className="flex justify-center p-4">
             <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
