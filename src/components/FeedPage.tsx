
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { User, Post, AdCampaign, PostType, Story, GroupedStory, CyberEvent, ChatConversation, Page } from '../types';
import { getPosts, getAds, getStories, getUsers, toggleFollowUser, getEvents, getChats, joinGroup, markStoryAsViewed } from '../services/storageService';
import { safeJsonStringify } from '../lib/utils';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import AdCard from './AdCard';
import StoryViewerModal from './StoryViewerModal';
import StoryCreator from './StoryCreator';
import GroupDiscoveryCard from './GroupDiscoveryCard';
import { PlusIcon, ArrowPathIcon, RocketLaunchIcon, ChevronUpIcon, FireIcon, SparklesIcon, CalendarIcon, UserGroupIcon, StarIcon, ArrowTrendingUpIcon, PlayIcon, FilmIcon } from '@heroicons/react/24/outline';
import { TrophyIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface FeedPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

const ITEMS_PER_PAGE = 10;

type FeedItem = 
  | Post 
  | AdCampaign 
  | ChatConversation 
  | { type: 'SUGGESTIONS_SHELF'; items: User[] } 
  | { type: 'REELS_SHELF'; items: Post[] } 
  | { type: 'GROUPS_SHELF'; items: ChatConversation[] };

const FeedPage: React.FC<FeedPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
  const { t } = useTranslation();
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<FeedItem[]>([]);
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [stories, setStories] = useState<GroupedStory[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [feedError, setFeedError] = useState(false);
  const [optimisticallyFollowed, setOptimisticallyFollowed] = useState<Set<string>>(new Set());
  
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'reels' | 'videos'>('all');
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // 🍪 Estados de Cookies de Rastreamento de Busca para Recomendação de Conteúdo
  const [cookieInterest, setCookieInterest] = useState<string>('');
  const [cookieHistory, setCookieHistory] = useState<string[]>([]);
  const [isCookieModeActive, setIsCookieModeActive] = useState<boolean>(true);
  const [customCookieInput, setCustomCookieInput] = useState<string>('');

  const loadCookies = useCallback(() => {
    if (typeof document === 'undefined') return;
    const getCookieValue = (name: string): string => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : '';
    };

    const interest = getCookieValue('search_interest');
    const historyRaw = getCookieValue('search_history');
    
    setCookieInterest(interest);
    setCookieHistory(historyRaw ? historyRaw.split(',').filter(Boolean) : []);
  }, []);

  useEffect(() => {
    loadCookies();
    const interval = setInterval(loadCookies, 2000);
    return () => clearInterval(interval);
  }, [loadCookies]);

  const handleClearCookies = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'search_interest=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
      document.cookie = 'search_history=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    }
    setCookieInterest('');
    setCookieHistory([]);
    loadData(true);
  };

  const handleSetCustomCookie = (term: string) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim().toLowerCase();
    if (typeof document !== 'undefined') {
      document.cookie = `search_interest=${encodeURIComponent(cleanTerm)}; path=/; max-age=604800; SameSite=Lax`;
      
      let currentHistory = [...cookieHistory];
      if (!currentHistory.includes(cleanTerm)) {
        currentHistory.unshift(cleanTerm);
        currentHistory = currentHistory.slice(0, 5);
      }
      document.cookie = `search_history=${encodeURIComponent(currentHistory.join(','))}; path=/; max-age=604800; SameSite=Lax`;
    }
    setCookieInterest(cleanTerm);
    setCustomCookieInput('');
    loadData(true);
  };

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (!activeElement || !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.85;
        if (isShrunk) setIsKeyboardOpen(true);
      }
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
        window.removeEventListener('focusin', handleFocus);
        window.removeEventListener('focusout', handleBlur);
        window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
        setLoading(true);
        setFeedError(false);
    }
    
    try {
        const [postsResult, allAds, allUsers, allStories, allChats] = await Promise.all([
          getPosts(currentUser.id, 50).catch(() => ({ items: [], lastDoc: null, hasMore: false })),
          getAds().catch(() => []),
          getUsers(currentUser).catch(() => []),
          getStories(currentUser.id).catch(() => []),
          getChats(currentUser.id).catch(() => [])
        ]);

        const allPosts = postsResult.items;

        // Filtrar Posts Normais e Reels - APENAS SEGUIDOS OU PRÓPRIOS E NÃO BLOQUEADOS
        const myFollows = currentUser.followedUsers || [];
        const myBlocked = currentUser.blockedUserIds || [];

        const filteredPosts = (allPosts || []).filter(p => {
          if (myBlocked.includes(p.userId)) return false;
          return p.userId === currentUser.id || myFollows.includes(p.userId) || p.isBoosted;
        });

        const normalPosts = filteredPosts.filter(p => p.type !== PostType.REEL).sort((a, b) => b.timestamp - a.timestamp);
        const reelsPosts = filteredPosts.filter(p => p.type === PostType.REEL).sort((a, b) => b.timestamp - a.timestamp);

        // RIGOROUS AD FILTERING
        const userAge = (Date.now() - currentUser.birthDate) / (31557600000); // Years approximation
        const activeAds = (allAds || []).filter(a => {
            if (!a.isActive) return false;
            // Age Filtering
            if (a.minAge && userAge < a.minAge) return false;
            if (a.maxAge && userAge > a.maxAge) return false;
            return true;
        }).sort((a, b) => (b.budget || 0) - (a.budget || 0));
        
        // 🍪 Algoritmo de Cookies de Recomendação de Busca
        let finalNormalPosts = [...normalPosts];
        let finalReelsPosts = [...reelsPosts];
        let finalAds = [...activeAds];

        const activeInterest = cookieInterest.trim().toLowerCase();
        if (activeInterest && isCookieModeActive) {
          // Filtrar os posts reais que contêm o termo de interesse do cookie
          const matchingNormals = normalPosts.filter(p => {
            const contentString = p.content || '';
            const authorString = p.authorName || '';
            return contentString.toLowerCase().includes(activeInterest) || authorString.toLowerCase().includes(activeInterest);
          });

          const matchingReels = reelsPosts.filter(p => {
            const descString = p.reel?.description || p.content || '';
            return descString.toLowerCase().includes(activeInterest);
          });

          const matchingAds = activeAds.filter(ad => {
            const titleString = ad.title || '';
            const descString = ad.description || '';
            return titleString.toLowerCase().includes(activeInterest) || descString.toLowerCase().includes(activeInterest);
          });

          // Injetar posts recomendados simulados de altíssima qualidade visual sobre o termo (sapatos, celular, etc.)
          const simPosts: Post[] = [
            {
              id: `sim_cookie_post_1_${activeInterest}`,
              userId: 'smart_cookie_recommendation',
              authorName: `Vitrine ${activeInterest.charAt(0).toUpperCase() + activeInterest.slice(1)} 🛍️`,
              authorProfilePic: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150',
              type: PostType.IMAGE,
              timestamp: Date.now() - 60000,
              content: `✨ **RECOMENDAÇÃO DOS SEUS COOKIES DE SESSÃO!** ✨\n\nNotamos seu interesse recente por **"${activeInterest}"** nas buscas. Nosso feed se reestruturou por completo para trazer as melhores soluções de mercado!\n\n🔥 Novas opções premium de **${activeInterest}** com descontos de até 40% exclusivas para membros FacePhone! Use o cupom: **COOKIES40**`,
              imageUrl: activeInterest.includes('sapato') || activeInterest.includes('shoe') || activeInterest.includes('tenis') || activeInterest.includes('tênis')
                ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' // Red sneaker
                : activeInterest.includes('celular') || activeInterest.includes('phone') || activeInterest.includes('iphone') || activeInterest.includes('smartphone')
                ? 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600' // smartphone
                : activeInterest.includes('futebol') || activeInterest.includes('esporte') || activeInterest.includes('soccer') || activeInterest.includes('camisa')
                ? 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600' // soccer soccer ball
                : 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600',
              isBoosted: true,
              likes: ['cookie_recommender', 'facephone_bot'],
              comments: [
                {
                  id: 'comment_cookie_1',
                  userId: 'friend_test',
                  userName: 'Rodrigo Medeiros',
                  profilePic: '',
                  text: `Nossa, esse feed de cookies é cirúrgico! Eu pesquisei ${activeInterest} e agora tudo se reordenou instantaneamente.`,
                  timestamp: Date.now() - 30000,
                  replies: []
                }
              ],
              shares: [],
              saves: [],
              isMonetized: true
            },
            {
              id: `sim_cookie_post_2_${activeInterest}`,
              userId: 'smart_critic_bot',
              authorName: `Análise Crítica: ${activeInterest.charAt(0).toUpperCase() + activeInterest.slice(1)} ⭐`,
              authorProfilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              type: PostType.TEXT,
              timestamp: Date.now() - 120000,
              content: `Você está na busca de **"${activeInterest}"**? Veja o feedback dos maiores especialistas e influenciadores digitais sobre a febre do momento:\n\n✅ Excelente performance e elegância incomparáveis\n✅ Integração nativa de hardware com a FacePhone Store\n⚠️ Alta procura devido ao rastreamento orgânico!`,
              isBoosted: false,
              likes: ['smart_buyer'],
              comments: [],
              shares: [],
              saves: []
            }
          ];

          finalNormalPosts = [...simPosts, ...matchingNormals];
          finalReelsPosts = matchingReels;
          finalAds = matchingAds;
        }

        // Filtrar Grupos Públicos
        const publicGroups = (allChats || []).filter(c => 
          c.type === 'GROUP' && 
          c.isPublic && 
          !c.participants?.includes(currentUser.id)
        );

        // Group Stories by User (Filtering blocked users)
        const groupedStoriesMap: Record<string, GroupedStory> = {};
        (allStories || [])
          .filter(s => !myBlocked.includes(s.userId))
          .forEach((item: Story) => {
            const storyUser = (allUsers || []).find(u => u.id === item.userId);
            
            if (!groupedStoriesMap[item.userId]) {
                groupedStoriesMap[item.userId] = {
                    userId: item.userId,
                    userName: storyUser ? `${storyUser.firstName} ${storyUser.lastName}` : (item.userName || 'Usuário'),
                    userProfilePic: storyUser?.profilePicture || item.userProfilePic || DEFAULT_PROFILE_PIC,
                    items: []
                };
            }
            groupedStoriesMap[item.userId].items.push(item);
        });

        const groupedStories = Object.values(groupedStoriesMap).sort((a, b) => {
            if (a.userId === currentUser.id) return -1;
            if (b.userId === currentUser.id) return 1;
            return 0;
        });
        setStories(groupedStories);
        
        // Safe check for followedUsers array to prevent crash
        // myFollows already declared above

        const suggestions = (allUsers || [])
          .filter(u => u && u.id !== currentUser.id && !myFollows.includes(u.id))
          .sort(() => 0.5 - Math.random())
          .slice(0, 8);
        setSuggestedUsers(suggestions);

        // Mixing Feed Logic
        let combined: FeedItem[] = [];
        let adPointer = 0;

        if (activeFeedTab === 'reels') {
          combined = finalReelsPosts;
        } else if (activeFeedTab === 'videos') {
          const videoPosts = filteredPosts.filter(p => p.type === PostType.VIDEO).sort((a, b) => b.timestamp - a.timestamp);
          combined = activeInterest && isCookieModeActive
            ? videoPosts.filter(p => {
                const contentStr = p.content || '';
                const authorStr = p.authorName || '';
                return contentStr.toLowerCase().includes(activeInterest) || authorStr.toLowerCase().includes(activeInterest);
              })
            : videoPosts;
        } else {
          // New Mixing Logic (Tab 'all')
          // Sort reels by views for "Featured" shelves
          const mostPlayedReels = [...finalReelsPosts].sort((a, b) => (b.views || 0) - (a.views || 0));
          const allSuggestions = (allUsers || []).filter(u => u && u.id !== currentUser.id && !myFollows.includes(u.id));
          
          let usedReelIds = new Set<string>();
          let usedSuggestionIds = new Set<string>();
          let suggestionPointer = 0;
          let reelPointer = 0;

          // Add first batch
          combined.push(...finalNormalPosts.slice(0, 5));
          
          // Helper to get next batch of items
          const getNextReels = (count: number) => {
            const batch = mostPlayedReels.filter(r => !usedReelIds.has(r.id)).slice(0, count);
            batch.forEach(r => usedReelIds.add(r.id));
            return batch;
          };

          const getNextSuggestions = (count: number) => {
            const batch = allSuggestions.filter(u => !usedSuggestionIds.has(u.id)).slice(0, count);
            batch.forEach(u => usedSuggestionIds.add(u.id));
            return batch;
          };

          // Groups Shelf First
          if (publicGroups.length > 0) {
            combined.push({ type: 'GROUPS_SHELF', items: publicGroups.slice(0, 5) });
          }

          // Loop to inject items every 5 posts
          for (let i = 5; i < finalNormalPosts.length; i += 5) {
            const batchIdx = (i / 5);
            
            // Inject a shelf every 5 posts
            if (batchIdx % 2 === 1) {
              const suggestions = getNextSuggestions(8);
              if (suggestions.length > 0) combined.push({ type: 'SUGGESTIONS_SHELF', items: suggestions });
            } else {
              const reels = getNextReels(8);
              if (reels.length > 0) combined.push({ type: 'REELS_SHELF', items: reels });
            }

            // Inject the next 5 posts
            const nextPosts = finalNormalPosts.slice(i, i + 5);
            nextPosts.forEach((post, idx) => {
                combined.push(post);
                // Ads for non-premium
                if (!currentUser.isPremium && (idx + 1) % 5 === 0 && adPointer < finalAds.length) {
                    combined.push(finalAds[adPointer]);
                    adPointer++;
                }
            });
          }
        }

        setAllItems(combined);
        
        if (isRefresh) {
            setVisibleItems(combined.slice(0, displayLimit));
        } else {
            setVisibleItems(combined.slice(0, ITEMS_PER_PAGE));
            setDisplayLimit(ITEMS_PER_PAGE);
        }
    } catch (e) {
        console.error("Erro crítico ao carregar feed:", safeJsonStringify(e));
        setFeedError(true);
    } finally {
        setLoading(false);
    }
  }, [currentUser.id, currentUser.isPremium, displayLimit, t, onNavigate, refreshUser, activeFeedTab, cookieInterest, isCookieModeActive]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadMoreItems = useCallback(() => {
    if (loadingMore || visibleItems.length >= allItems.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      const nextLimit = displayLimit + ITEMS_PER_PAGE;
      setVisibleItems(allItems.slice(0, nextLimit));
      setDisplayLimit(nextLimit);
      setLoadingMore(false);
    }, 400);
  }, [displayLimit, allItems, loadingMore, visibleItems.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && visibleItems.length < allItems.length) {
        loadMoreItems();
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, loadMoreItems, visibleItems.length, allItems.length]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 1000);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoin = useCallback(async (groupId: string) => {
    await joinGroup(groupId, currentUser.id);
    loadData(true);
  }, [currentUser.id, loadData]);

  const handleFollow = useCallback(async (targetId: string) => {
    // Optimistic Update: Mark as followed instantly for UI feedback
    setOptimisticallyFollowed(prev => {
      const next = new Set(prev);
      next.add(targetId);
      return next;
    });

    // Execute background logic WITHOUT awaiting if not critical for UI
    (async () => {
      try {
          await toggleFollowUser(currentUser.id, targetId);
          refreshUser();
          
          // Fetch new followed user's posts to show them
          const userPostsRes = await getPosts(currentUser.id, 5, undefined, targetId);
          const newPosts = userPostsRes.items;
          
          if (newPosts.length > 0) {
              setAllItems(prev => {
                const existingIds = new Set(prev.map((i: any) => i.id));
                const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                return [...uniqueNewPosts, ...prev];
              });
              setVisibleItems(prev => {
                const existingIds = new Set(prev.map((i: any) => i.id));
                const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                return [...uniqueNewPosts, ...prev];
              });
          }
      } catch (error) {
          // Rollback on error
          setOptimisticallyFollowed(prev => {
            const next = new Set(prev);
            next.delete(targetId);
            return next;
          });
          console.error("Erro ao seguir:", safeJsonStringify(error));
      }
    })();
  }, [currentUser.id, refreshUser]);

  const handlePostUpdate = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const isAtEnd = visibleItems.length >= allItems.length && allItems.length > 0;
  const hasMyStory = stories.some(s => s.userId === currentUser.id);

  const renderedItems = useMemo(() => {
    return visibleItems.map((item: any, idx) => {
        if (item.authorName) { 
          // Fix: Pass handleFollow to PostCard so it actually works
          return <PostCard key={item.id} post={item as Post} currentUser={currentUser} onNavigate={onNavigate} onFollowToggle={handleFollow} refreshUser={refreshUser} onPostUpdatedOrDeleted={handlePostUpdate} onPinToggle={handlePostUpdate} />;
        }
        if (item.professorId) { 
          return <AdCard key={item.id} ad={item as AdCampaign} rank={idx} />;
        }
        if (item.type === 'SUGGESTIONS_SHELF') {
          return (
            <motion.div 
              key={`sugg-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden border-4 border-white/10" 
              style={{ backgroundColor: 'var(--brand-color)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 pointer-events-none"></div>
                <SparklesIcon className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10 rotate-12" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                      <h4 className="font-black text-xl tracking-tighter flex items-center gap-2"><FireIcon className="h-6 w-6 text-yellow-400" /> {t('networking_label')}</h4>
                      <p className="text-white font-bold text-[11px] uppercase tracking-widest drop-shadow-sm opacity-80">{t('networking_sugg')}</p>
                  </div>
                  <button onClick={() => loadData(true)} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"><ArrowPathIcon className="h-5 w-5"/></button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar relative z-10 snap-x">
                  {item.items.filter((u: User) => !optimisticallyFollowed.has(u.id)).map((u: User, uIdx: number) => (
                    <motion.div 
                      key={u.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: uIdx * 0.05 }}
                      viewport={{ once: true }}
                      className="bg-white/10 backdrop-blur-md p-3 rounded-[1.8rem] min-w-[130px] flex flex-col items-center text-center border border-white/20 group hover:bg-white/20 transition-all snap-start shadow-lg"
                    >
                        <img src={u.profilePicture || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-white/40 shadow-xl group-hover:scale-110 transition-transform" />
                        <p className="font-black text-xs truncate w-full mb-0.5 text-white shadow-sm">{u.firstName || 'Membro'}</p>
                        <p className="text-[9px] font-bold uppercase mb-3 tracking-wide truncate w-full shadow-sm opacity-90" style={{ color: 'var(--brand-light)' }}>{u.lastName || 'Conexão'}</p>
                        <button 
                          onClick={() => handleFollow(u.id)} 
                          disabled={optimisticallyFollowed.has(u.id)}
                          className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase shadow-md active:scale-95 transition-all ${optimisticallyFollowed.has(u.id) ? 'bg-emerald-400 text-white cursor-default' : 'bg-white hover:bg-gray-50'}`} 
                          style={{ color: optimisticallyFollowed.has(u.id) ? 'white' : 'var(--brand-color)' }}
                        >
                          {optimisticallyFollowed.has(u.id) ? t('followed') : t('follow')}
                        </button>
                    </motion.div>
                  ))}
                </div>
            </motion.div>
          );
        }
        if (item.type === 'REELS_SHELF') {
          return (
            <motion.div 
              key={`reels-shelf-${idx}`} 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="py-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <FilmIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-black text-base dark:text-white uppercase tracking-tight">{t('trending_reels')}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Destaques</span>
                  </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x px-1">
                  {item.items.map((reel: Post, rIdx: number) => (
                    <motion.div 
                      key={reel.id} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: rIdx * 0.05 }}
                      viewport={{ once: true }}
                      onClick={() => onNavigate('reels-page', { startPostId: reel.id })}
                      className="relative min-w-[140px] md:min-w-[160px] aspect-[9/16] rounded-[1.5rem] overflow-hidden cursor-pointer group shadow-xl snap-start border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
                    >
                      <video src={reel.reel?.videoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayIcon className="h-6 w-6 text-white" />
                          </div>
                      </div>
                      
                      {/* View Counter Badge */}
                      <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                        <ArrowTrendingUpIcon className="h-3 w-3 text-white" />
                        <span className="text-[9px] font-black text-white">{reel.views || 0}</span>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                          <p className="text-white text-[10px] font-bold line-clamp-2 leading-tight mb-1">{reel.reel?.description}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                             <img src={reel.authorProfilePic || DEFAULT_PROFILE_PIC} className="w-4 h-4 rounded-full border border-white/20" alt="Author" />
                             <p className="text-white/80 text-[7px] font-black uppercase tracking-wider truncate">@{reel.authorName}</p>
                          </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          );
        }
        if (item.type === 'GROUPS_SHELF') {
          return (
            <div key="groups-shelf" className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 mb-3">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="font-black text-base dark:text-white uppercase tracking-tight">{t('communities')}</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x">
                  {item.items.map((group: ChatConversation) => (
                    <div key={group.id} className="min-w-[220px] snap-start">
                      <GroupDiscoveryCard group={group} onJoin={() => handleJoin(group.id)} />
                    </div>
                  ))}
              </div>
            </div>
          );
        }
        return null;
    });
  }, [visibleItems, currentUser, onNavigate, loadData, refreshUser, suggestedUsers]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 md:px-6 lg:px-8 py-4 md:py-6 relative">
      {/* Floating actions removed as per user request (the "blue thing") */}

      {/* STORIES HEADER */}
      <div className="mb-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2 snap-x relative z-10">
         <div className="flex items-start gap-3 px-2">
            {/* DEDICATED ADD BUTTON */}
            <div 
              onClick={() => setIsCreatingStory(true)} 
              className="flex flex-col items-center gap-1.5 cursor-pointer group min-w-[70px] flex-shrink-0 snap-start"
            >
               <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-2 border-dashed border-emerald-500 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-all">
                     <PlusIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  </div>
               </div>
               <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate w-full text-center">
                  {t('add_f')}
               </span>
            </div>

            {/* MY STATUS (ONLY IF EXISTS) */}
            {hasMyStory && (
              <div 
                onClick={() => setSelectedStoryIndex(stories.findIndex(s => s.userId === currentUser.id))} 
                className="flex flex-col items-center gap-1.5 cursor-pointer group min-w-[70px] flex-shrink-0 snap-start active:scale-95 transition-transform"
              >
                 <div className="relative p-[2px]">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {(() => {
                        const myStory = stories.find(s => s.userId === currentUser.id);
                        const count = myStory?.items.length || 0;
                        const gap = count > 1 ? 5 : 0;
                        const segmentLength = (360 - (count * gap)) / count;
                        return Array.from({ length: count }).map((_, i) => (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="48"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${(segmentLength / 360) * 301.59} 301.59`}
                            strokeDashoffset={-((segmentLength + gap) * i / 360) * 301.59}
                            className="text-emerald-500"
                          />
                        ));
                      })()}
                    </svg>
                    <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-full border-2 border-white dark:border-darkbg object-cover relative z-10" />
                 </div>
                 <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate w-full text-center">
                    {t('my_status')}
                 </span>
              </div>
            )}

            {stories.filter(s => s.userId !== currentUser.id).map((story) => {
               const realIndex = stories.findIndex(s => s.userId === story.userId);
               const count = story.items.length;
               const gap = count > 1 ? 5 : 0;
               const segmentLength = (360 - (count * gap)) / count;
               
               return (
                  <div 
                    key={story.userId} 
                    onClick={() => setSelectedStoryIndex(realIndex)} 
                    className="flex flex-col items-center gap-1.5 cursor-pointer group min-w-[70px] flex-shrink-0 snap-start active:scale-95 transition-transform"
                  >
                     <div className="relative p-[2px]">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {Array.from({ length: count }).map((_, i) => {
                            const isViewed = story.items[i].views?.includes(currentUser.id);
                            return (
                              <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="48"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${(segmentLength / 360) * 301.59} 301.59`}
                                strokeDashoffset={-((segmentLength + gap) * i / 360) * 301.59}
                                className={isViewed ? "text-gray-300 dark:text-white/20" : "text-emerald-500"}
                              />
                            );
                          })}
                        </svg>
                        <img src={story.userProfilePic || DEFAULT_PROFILE_PIC} className="w-16 h-16 rounded-full border-2 border-white dark:border-darkbg object-cover relative z-10" />
                     </div>
                     <span className="text-[10px] font-bold text-gray-900 dark:text-white truncate w-[70px] text-center">
                        {(story.userName || 'Usuário').split(' ')[0]}
                     </span>
                  </div>
               );
            })}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <main className="lg:col-span-8 space-y-2">
          {/* TAB SWITCHER */}
          <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1.5 rounded-3xl border border-gray-100 dark:border-white/10 w-full overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveFeedTab('all')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              Feed Principal
            </button>
            <button 
              onClick={() => setActiveFeedTab('reels')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'reels' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              Reels
            </button>
            <button 
              onClick={() => setActiveFeedTab('videos')}
              className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter transition-all ${activeFeedTab === 'videos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              Vídeos
            </button>
          </div>

          <CreatePost currentUser={currentUser} onPostCreated={() => loadData(true)} refreshUser={refreshUser} />
          
          <div className="space-y-px">
            {feedError ? (
                <div className="py-20 text-center flex flex-col items-center">
                    <p className="text-red-500 font-bold mb-4">{t('feed_load_error')}</p>
                    <button 
                        onClick={() => loadData(true)} 
                        className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700 transition-all"
                    >
                        {t('try_again')}
                    </button>
                </div>
            ) : loading ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">{t('loading_feed')}</p>
              </div>
            ) : (
              <>
                {renderedItems}

                <div ref={observerTarget} className="h-24 flex flex-col items-center justify-center">
                  {loadingMore && (
                    <>
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('loading_dots')}</p>
                    </>
                  )}
                  {isAtEnd && !loadingMore && (
                    <div className="flex flex-col items-center gap-2 opacity-50 py-8">
                       <CheckCircleIcon className="h-8 w-8 text-green-500" />
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t('end_of_content')}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        <aside className="hidden lg:block lg:col-span-4 space-y-6">
           <div className="sticky top-24 space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                 <RocketLaunchIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                 <h3 className="text-xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <TrophyIcon className="h-6 w-6 text-yellow-400" /> FacePhone
                 </h3>
                 <p className="text-xs font-bold text-blue-100 mb-6 leading-relaxed">
                   {t('networking_desc')}
                 </p>
                 <button onClick={() => onNavigate('ads')} className="w-full bg-white text-blue-700 py-4 rounded-2xl font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <RocketLaunchIcon className="h-5 w-5" /> {t('create_ad')}
                 </button>
              </div>
           </div>
        </aside>
      </div>
      
      {isCreatingStory && <StoryCreator currentUser={currentUser} onClose={() => setIsCreatingStory(false)} onSuccess={() => { loadData(true); }} />}
      
      {selectedStoryIndex !== null && (
        <StoryViewerModal 
          stories={stories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)} 
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default FeedPage;
