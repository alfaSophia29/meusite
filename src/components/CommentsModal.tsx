
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment, User, NotificationType } from '../types';
import { addPostComment, getPosts, generateUUID, toggleReaction, addCommentReply, createNotification, getPostById, deleteComment, editComment } from '../services/storageService';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleOvalLeftIcon, FaceSmileIcon, TrashIcon, ChatBubbleLeftRightIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/solid';
import { DEFAULT_PROFILE_PIC, ANONYMOUS_MASK_PIC } from '../data/constants';
import { checkContent } from '../services/sentinelService';
import { useDialog } from '../services/DialogContext';

interface CommentsModalProps {
  postId: string;
  currentUser: User;
  onClose: () => void;
  onCommentsUpdated: () => void;
  postOwnerId?: string;
}

const CommentsModal: React.FC<CommentsModalProps> = ({ postId, currentUser, onClose, onCommentsUpdated, postOwnerId }) => {
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string } | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    const post = await getPostById(postId);
    if (post) {
      setComments(post.comments || []);
      // If comments are disabled for everyone, ensure we respect that
      if (post.disableComments) {
        setSubmitting(true); // Effectively disable submit
      }
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    showConfirm("Deseja realmente excluir este comentário?", async () => {
      try {
        await deleteComment(postId, commentId);
        await fetchComments();
        onCommentsUpdated();
      } catch (err) {
        console.error("Erro ao deletar comentário:", err);
        showAlert("Erro ao deletar comentário.", { type: 'error' });
      }
    });
  };

  const handleStartEdit = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingText(currentText);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      const sentinelResult = await checkContent(editingText.trim(), 'comment');
      if (!sentinelResult.isSafe) {
        showAlert(sentinelResult.reason || 'Comentário bloqueado por violar as políticas de segurança.', { type: 'error', title: 'Sentinela de Segurança' });
        return;
      }

      await editComment(postId, commentId, editingText.trim());
      setEditingCommentId(null);
      setEditingText('');
      await fetchComments();
      onCommentsUpdated();
    } catch (err) {
      console.error("Erro ao editar comentário:", err);
      showAlert("Erro ao editar comentário.", { type: 'error' });
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (commentsEndRef.current && !loading) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Sentinel AI Check
      const sentinelResult = await checkContent(newComment.trim(), 'comment');
      if (!sentinelResult.isSafe) {
        showAlert(sentinelResult.reason || 'Comentário bloqueado por violar as políticas de segurança.', { type: 'error', title: 'Sentinela de Segurança' });
        setSubmitting(false);
        return;
      }

      const isMember = currentUser.clubSubscriptions && postOwnerId && currentUser.clubSubscriptions[postOwnerId];

      const comment: Comment = {
        id: generateUUID(),
        userId: currentUser.id,
        userName: isAnonymous ? t('anonymous_user') : `${currentUser.firstName} ${currentUser.lastName}`,
        profilePic: isAnonymous ? ANONYMOUS_MASK_PIC : currentUser.profilePicture,
        text: newComment,
        timestamp: Date.now(),
        isAnonymous: isAnonymous,
        isChannelMember: !isAnonymous && !!isMember,
        channelMemberTier: !isAnonymous && isMember ? isMember.tierName : undefined
      };

      if (replyingTo) {
        await addCommentReply(postId, replyingTo.id, comment);
        const targetComment = comments.find(c => c.id === replyingTo.id);
        if (targetComment && targetComment.userId !== currentUser.id) {
           await createNotification(targetComment.userId, currentUser.id, NotificationType.COMMENT, postId);
        }
        setReplyingTo(null);
      } else {
        await addPostComment(postId, comment);
      }
      setNewComment('');
      await fetchComments();
      onCommentsUpdated();
    } catch (err) {
      console.error("Erro ao comentar:", err);
      showAlert("Ocorreu um erro ao enviar seu comentário.", { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await toggleReaction(commentId, 'COMMENT', emoji, currentUser.id, postId);
      await fetchComments();
    } catch (err) {
      console.error("Erro ao reagir:", err);
    }
  };

  const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '😢', '👍', '🙏'];

  const RenderComment = ({ c, depth = 0 }: { c: Comment, depth?: number }) => {
    const displayName = c.isAnonymous ? t('anonymous_user') : c.userName;
    const displayPic = c.isAnonymous ? ANONYMOUS_MASK_PIC : (c.profilePic || DEFAULT_PROFILE_PIC);
    const isEditing = editingCommentId === c.id;

    const isCommentOwner = c.userId === currentUser.id;
    const isPostOwner = currentUser.id === postOwnerId;

    return (
      <div 
        className={`flex gap-3 group animate-fade-in ${depth > 0 ? 'ml-8 border-l border-gray-100 dark:border-white/10 pl-3' : ''}`}
      >
        <img src={displayPic} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10" alt={displayName} />
        <div className="flex-1">
          <div className={`p-3 rounded-2xl rounded-tl-none shadow-sm border relative ${
            c.isSuperChat 
              ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/35 dark:border-amber-500/20' 
              : c.isChannelMember
                ? 'bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border-emerald-500/25 dark:border-emerald-500/15'
                : 'bg-white dark:bg-zinc-850 border-gray-100 dark:border-white/5'
          }`}>
            <div className="flex justify-between items-start mb-1 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{displayName}</p>
                {c.isChannelMember && (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-emerald-500/20" title={`Membro: ${c.channelMemberTier || 'Clube'}`}>
                    ★ Membro ({c.channelMemberTier || 'Clube'})
                  </span>
                )}
                {c.isSuperChat && (
                  <span className="bg-amber-500 text-black text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm" title={`Apoio: ${c.superChatAmount || 0} AOA`}>
                    ⚡ SUPER SUPPORT ({c.superChatAmount} AOA)
                  </span>
                )}
              </div>
              
              {/* Actions for edit/delete */}
              <div className="flex items-center gap-1 opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {isCommentOwner && !isEditing && (
                  <button 
                    onClick={() => handleStartEdit(c.id, c.text)} 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-400 hover:text-blue-500 transition-colors"
                    title="Editar comentário"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                )}
                {(isCommentOwner || isPostOwner) && (
                  <button 
                    onClick={() => handleDeleteComment(c.id)} 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                    title="Excluir comentário"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2 mt-2">
                <input 
                  type="text" 
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 text-xs font-bold dark:text-white p-2 rounded-xl border border-gray-200 dark:border-white/10 focus:border-blue-500 outline-none"
                />
                <div className="flex gap-1 justify-end">
                  <button 
                    onClick={() => setEditingCommentId(null)} 
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-220 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-lg text-[9px] uppercase font-black"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleSaveEdit(c.id)} 
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] uppercase font-black flex items-center gap-1"
                  >
                    <CheckIcon className="h-2.5 w-2.5" /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{c.text}</p>
            )}
            
            {/* Reactions Display */}
            {c.reactions && Object.keys(c.reactions).some(emoji => c.reactions![emoji].length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(c.reactions).map(([emoji, users]) => (
                  users.length > 0 && (
                    <button 
                      key={emoji}
                      onClick={() => handleReaction(c.id, emoji)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border transition-all ${users.includes(currentUser.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-gray-50 border-gray-100 dark:bg-white/5 dark:border-white/10'}`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold dark:text-white">{users.length}</span>
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 ml-2 mt-1">
            <span className="text-[9px] text-gray-400 font-bold">{new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            
            {!isEditing && (
              <button 
                onClick={() => {
                  setReplyingTo({ id: c.id, userName: c.userName });
                  inputRef.current?.focus();
                }}
                className="text-[9px] text-gray-400 font-bold hover:text-blue-500 transition-colors uppercase"
              >
                Responder
              </button>
            )}

            {/* Reaction Picker */}
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              {REACTION_EMOJIS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => handleReaction(c.id, emoji)}
                  className="hover:scale-125 transition-transform p-0.5 text-[12px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Recursive Replies */}
          {c.replies && c.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {c.replies.map(reply => (
                <RenderComment key={reply.id} c={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-darkcard w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden relative">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-darkcard sticky top-0 z-10">
          <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
            <ChatBubbleOvalLeftIcon className="h-5 w-5 text-blue-600" /> {t('comments_label') || 'Comentários'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-black/20">
          {loading ? (
             <div className="flex justify-center py-10">
               <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : comments.length === 0 ? (
             <div className="text-center py-10 opacity-50">
               <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Nenhum comentário ainda</p>
             </div>
          ) : (
             <div className="space-y-6">
               {comments.map((comment) => (
                 <RenderComment key={comment.id} c={comment} />
               ))}
             </div>
          )}
          <div ref={commentsEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-darkcard border-t border-gray-100 dark:border-white/5 sticky bottom-0 z-10">
          <div className="flex items-center justify-between mb-3 px-1">
             <button 
                type="button" 
                onClick={() => setIsAnonymous(!isAnonymous)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] uppercase font-black ${isAnonymous ? 'bg-gray-800 text-white border-transparent' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10'}`}
             >
                <div className={`w-2 h-2 rounded-full ${isAnonymous ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-gray-600'}`}></div>
                {t('comment_anonymous')}
             </button>
          </div>
          {replyingTo && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl mb-2 border border-blue-100 dark:border-blue-800/20">
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-tight">{t('replying_to')} <span className="font-black">@{replyingTo.userName}</span></p>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-full text-blue-600"><XMarkIcon className="h-4 w-4"/></button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-full border-2 border-transparent focus-within:border-blue-500 transition-all overflow-hidden relative">
            <img src={currentUser.profilePicture || DEFAULT_PROFILE_PIC} className="w-8 h-8 rounded-full object-cover shrink-0" alt="Me" />
            <input 
              ref={inputRef}
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Sua resposta..." : "Adicione um comentário..."}
              disabled={submitting}
              className="flex-1 bg-transparent outline-none border-none ring-0 focus:ring-0 text-xs font-bold dark:text-white p-2 rounded-full"
            />
            <button 
              type="submit" 
              disabled={!newComment.trim() || submitting}
              className="p-2 bg-blue-600 text-white rounded-lg shadow-md disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all active:scale-95"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <PaperAirplaneIcon className="h-4 w-4" />
              )}
            </button>
            {submitting && !newComment.trim() && (
               <div className="absolute inset-0 bg-gray-100/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center cursor-not-allowed">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Comentários Desativados</span>
               </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
