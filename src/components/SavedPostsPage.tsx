
import React, { useState, useEffect } from 'react';
import { User, Post, Page } from '../types';
import { getSavedPosts } from '../services/storageService';
import PostCard from './PostCard';
import { BookmarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface SavedPostsPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => Promise<void>;
}

const SavedPostsPage: React.FC<SavedPostsPageProps> = ({ currentUser, onNavigate, refreshUser }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSavedPosts = async () => {
        setLoading(true);
        try {
            const savedPosts = await getSavedPosts(currentUser.id);
            setPosts(savedPosts);
        } catch (error) {
            console.error("Erro ao carregar posts salvos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSavedPosts();
    }, [currentUser.id]);

    return (
        <div className="container mx-auto px-4 pt-10 pb-20 max-w-2xl animate-fade-in">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-brand/10 rounded-2xl">
                    <BookmarkIcon className="h-8 w-8 text-brand" />
                </div>
                <div>
                    <h2 className="text-4xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">Itens Salvos</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Sua coleção privada de publicações</p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand mb-4"></div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Carregando seus salvos...</p>
                </div>
            ) : posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map(post => (
                        <PostCard 
                            key={post.id} 
                            post={post} 
                            currentUser={currentUser} 
                            onNavigate={onNavigate} 
                            refreshUser={refreshUser}
                            onPostUpdatedOrDeleted={fetchSavedPosts}
                            onFollowToggle={() => {}}
                            onPinToggle={() => {}}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-darkcard p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-white/5">
                    <BookmarkIcon className="h-16 w-16 text-gray-100 dark:text-white/5 mx-auto mb-6" />
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Nada salvo ainda</h3>
                    <p className="text-gray-500 text-xs font-medium mb-8">Role o feed e salve publicações interessantes para ver aqui mais tarde.</p>
                    <button 
                        onClick={() => onNavigate('feed')}
                        className="bg-brand text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                        <ArrowPathIcon className="h-4 w-4" /> Explorar Feed
                    </button>
                </div>
            )}
        </div>
    );
};

export default SavedPostsPage;
