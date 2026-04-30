
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification, User, Post, NotificationType, Page } from '../types';
import { getNotificationsForUser, findUserById, getPosts, toggleFollowUser, markNotificationsAsRead, clearAllNotifications, deleteNotification } from '../services/storageService';
import { translateText } from '../services/translationService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { HeartIcon, ChatBubbleOvalLeftIcon, UserPlusIcon, CurrencyDollarIcon, StarIcon, EnvelopeIcon, RocketLaunchIcon, ShareIcon, UserGroupIcon, ArrowPathIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/solid';

interface NotificationsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const timeAgo = (timestamp: number, t: any): string => {
  const now = new Date();
  const secondsPast = (now.getTime() - timestamp) / 1000;

  if (secondsPast < 60) return t('time_s', { count: Math.round(secondsPast) });
  if (secondsPast < 3600) return t('time_m', { count: Math.round(secondsPast / 60) });
  if (secondsPast <= 86400) return t('time_h', { count: Math.round(secondsPast / 3600) });
  const days = Math.round(secondsPast / 86400);
  if (days <= 7) return t('time_d', { count: days });
  return new Date(timestamp).toLocaleDateString();
};

const NotificationItem: React.FC<{ 
  notification: Notification; 
  onNavigate: (page: Page, params?: Record<string, string>) => void; 
  refreshUser: () => void; 
  currentUser: User; 
  allPosts: Post[]; 
  onDelete: (id: string) => void 
}> = ({ notification, onNavigate, refreshUser, currentUser, allPosts, onDelete }) => {
  const { t, i18n } = useTranslation();
  const [actor, setActor] = useState<User | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
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
      default: return null;
    }
  };

  const renderMessage = () => {
    const actorName = <strong className="font-semibold">{`${actor.firstName} ${actor.lastName}`}</strong>;
    switch (notification.type) {
      case NotificationType.LIKE: return <>{actorName} {t('notif_liked')}</>;
      case NotificationType.COMMENT: return <>{actorName} {t('notif_commented')}</>;
      case NotificationType.NEW_FOLLOWER: return <>{actorName} {t('notif_followed')}</>;
      case NotificationType.AFFILIATE_SALE: return <>{t('notif_sale', { actor: `${actor.firstName} ${actor.lastName}` })}</>;
      case NotificationType.REACTION: return <>{actorName} {t('notif_reacted')}</>;
      case NotificationType.MESSAGE: return <>{actorName} {t('notif_message')}</>;
      case NotificationType.NEW_POST: return <>{actorName} {t('notif_new_post')}</>;
      case NotificationType.INDICATION: return <>{actorName} {t('notif_indication')}</>;
      case NotificationType.GROUP_POST: return <>{actorName} {t('notif_group_post', { group: notification.groupName })}</>;
      default: return t('notif_default');
    }
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (translatedText) {
        setTranslatedText(null);
        return;
    }
    
    setIsTranslating(true);
    try {
        const textToTranslate = document.getElementById(`notif-text-${notification.id}`)?.innerText || '';
        const langMap: Record<string, string> = {
            'pt': 'Português',
            'en': 'English',
            'es': 'Español'
        };
        const targetLang = langMap[i18n.language.split('-')[0]] || 'Português';
        const translated = await translateText(textToTranslate, targetLang);
        setTranslatedText(translated);
    } catch (error) {
        console.error("Translation error", error);
    } finally {
        setIsTranslating(false);
    }
  };

  return (
    <div onClick={handleNavigation} className="flex items-center p-3 space-x-4 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200 group">
      <div className="relative">
        <img src={actor.profilePicture || DEFAULT_PROFILE_PIC} alt={actor.firstName} className="w-12 h-12 rounded-full object-cover" />
        <div className="absolute -bottom-1 -right-1">{renderIcon()}</div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
            <p id={`notif-text-${notification.id}`} className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200 font-medium'}`}>
                {translatedText || renderMessage()}
            </p>
            <button 
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title={t('delete_notification')}
            >
                <TrashIcon className="h-4 w-4" />
            </button>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{timeAgo(notification.timestamp, t)}</span>
            <button 
                onClick={handleTranslate} 
                className="text-[10px] font-black uppercase text-brand hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
            >
                {isTranslating ? <ArrowPathIcon className="h-2.5 w-2.5 animate-spin" /> : (translatedText ? t('view_original') : t('translate'))}
            </button>
        </div>
      </div>
      {post && post.imageUrl && (
        <img src={post.imageUrl} alt="Post thumbnail" className="w-12 h-12 object-cover rounded-md" />
      )}
      {notification.type === NotificationType.NEW_FOLLOWER && (
        <button onClick={handleFollowToggle} className={`px-3 py-1 text-sm font-semibold rounded-full ${isFollowingActor ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
          {isFollowingActor ? t('following_m') : t('follow_back')}
        </button>
      )}
    </div>
  );
};

const NotificationsPage: React.FC<NotificationsPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const userNotifications = await getNotificationsForUser(currentUser.id);
    const sortedNotifications = userNotifications.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(sortedNotifications);
  };

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        await fetchNotifications();
        const posts = await getPosts();
        setAllPosts(posts); 
        setLoading(false);
    };
    fetchData();
  }, [currentUser.id]);

  const handleMarkAllAsRead = async () => {
    await markNotificationsAsRead(currentUser.id);
    await fetchNotifications();
  };

  const handleClearAll = async () => {
    await clearAllNotifications(currentUser.id);
    setNotifications([]);
  };

  const handleDeleteOne = async (id: string) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      [t('today')]: [],
      [t('this_week')]: [],
      [t('this_month')]: [],
      [t('older')]: [],
    };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = today - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = today - 30 * 24 * 60 * 60 * 1000;

    notifications.forEach(n => {
      if (n.timestamp >= today) groups[t('today')].push(n);
      else if (n.timestamp >= oneWeekAgo) groups[t('this_week')].push(n);
      else if (n.timestamp >= oneMonthAgo) groups[t('this_month')].push(n);
      else groups[t('older')].push(n);
    });

    return groups;
  }, [notifications, t]);

  if (loading) {
    return <div className="p-8 text-center dark:text-gray-400">{t('loading_notifications')}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-24 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-3 border-gray-200 dark:border-white/10">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('notifications')}</h2>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                >
                    <CheckIcon className="h-4 w-4" />
                    {t('notifications_mark_read')}
                </button>
                <button 
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                >
                    <TrashIcon className="h-4 w-4" />
                    {t('notifications_delete')}
                </button>
            </div>
          )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center p-10 bg-white dark:bg-darkcard rounded-2xl shadow-sm border border-gray-200 dark:border-white/10">
          <p className="text-xl text-gray-600 dark:text-gray-400">{t('no_notifications')}</p>
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
                      onDelete={handleDeleteOne}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
