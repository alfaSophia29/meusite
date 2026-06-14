import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { 
  createSupportTicket, 
  addSupportMessage, 
  subscribeToSupportTickets 
} from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { 
  MessageSquare, 
  HelpCircle, 
  Send, 
  Check, 
  Plus, 
  ChevronLeft, 
  BookOpen, 
  ShieldCheck, 
  Truck, 
  CircleDollarSign, 
  X, 
  ChevronDown, 
  ExternalLink, 
  MessageCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

interface SupportPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ currentUser, onNavigate }) => {
  const { showSuccess, showError } = useDialog();
  const [viewMode, setViewMode] = useState<'home' | 'tickets' | 'chat'>('home');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Ticket-related states
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  
  // New ticket fields
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'TECHNICAL' | 'BILLING' | 'ABUSE' | 'OTHER'>('TECHNICAL');
  const [firstMessage, setFirstMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Active chat state
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to support tickets in real-time
  useEffect(() => {
    const unsubscribe = subscribeToSupportTickets(currentUser.id, (ticketsList) => {
      const sortedTickets = ticketsList.sort((a, b) => b.updatedAt - a.updatedAt);
      setTickets(sortedTickets);
      
      // Update selected ticket in real-time to show new messages instantly
      if (selectedTicket) {
        const updated = sortedTickets.find(t => t.id === selectedTicket.id);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser.id, selectedTicket?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (viewMode === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages, viewMode]);

  const faqs = [
    {
      q: 'Como funcionam os pagamentos?',
      a: 'Aceitamos pagamentos via Unitel Money e Criptomoedas (USDT) através da Cryptomus. Os pagamentos são processados instantaneamente de forma automática.',
      icon: CircleDollarSign
    },
    {
      q: 'Como recebo meus produtos digitais?',
      a: 'Após a confirmação do pagamento, você receberá uma notificação em tempo real no app e o conteúdo estará disponível instantaneamente na sua aba de "Minhas Compras".',
      icon: ShieldCheck
    },
    {
      q: 'Qual o prazo de entrega para produtos físicos?',
      a: 'Para a capital e arredores, entregamos entre 24h a 48h. Para as demais regiões, o prazo médio é de 3 a 7 dias úteis via nossas transportadoras parceiras oficiais.',
      icon: Truck
    },
    {
      q: 'É seguro comprar no FacePhone?',
      a: 'Sim. Utilizamos tecnologia Escrow e verificação de identidade oficial para garantir que seu dinheiro só chegue ao vendedor após a entrega confirmada.',
      icon: HelpCircle
    }
  ];

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent('Olá Administradores do FacePhone, preciso de suporte directo com a minha conta.');
    window.open(`https://wa.me/244926815124?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !firstMessage.trim()) {
      showError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketData = {
        userId: currentUser.id,
        subject: newSubject.trim(),
        category: newCategory,
      };

      await createSupportTicket(ticketData, firstMessage.trim());
      
      showSuccess('Conversa direta com administradores iniciada!');
      setNewSubject('');
      setFirstMessage('');
      setShowNewTicketForm(false);
      setViewMode('tickets');
    } catch (err: any) {
      showError('Erro ao iniciar chat com administrador: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const messageContent = replyText.trim();
    setReplyText(''); // Fast UI response

    try {
      const msgObj = {
        senderId: currentUser.id,
        text: messageContent,
        timestamp: Date.now()
      };
      await addSupportMessage(selectedTicket.id, msgObj);
    } catch (err: any) {
      showError('Erro ao mandar mensagem: ' + err.message);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'TECHNICAL': return 'Suporte Técnico';
      case 'BILLING': return 'Financeiro / Recargas';
      case 'ABUSE': return 'Denúncia de Abuso';
      default: return 'Outros Assuntos';
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-6 bg-slate-50 dark:bg-[#0a0c10] text-[#0f172a] dark:text-zinc-100">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation Breadcrumb inside ticketing view */}
        {viewMode !== 'home' && (
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                if (viewMode === 'chat') {
                  setViewMode('tickets');
                } else {
                  setViewMode('home');
                }
              }} 
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>

            {viewMode === 'tickets' && (
              <button 
                onClick={() => setShowNewTicketForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Novo Chat
              </button>
            )}
          </div>
        )}

        {/* --- VIEW MODE: HOME --- */}
        {viewMode === 'home' && (
          <>
            {/* Elegant Header Banner */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Canal dos Administradores</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
                Estamos prontos para <span className="text-blue-600 italic">ajudar você</span>
              </h2>
              <p className="text-gray-500 dark:text-zinc-400 font-medium text-xs md:text-sm max-w-xl mx-auto italic font-serif">
                "Fale diretamente com os administradores oficiais do FacePhone ou use o WhatsApp direto para urgências. Nada de e-mail."
              </p>
            </div>

            {/* Support Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              
              {/* WhatsApp Support Connector */}
              <div 
                onClick={handleOpenWhatsApp}
                className="bg-white dark:bg-zinc-950 p-7 md:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 hover:border-emerald-500/55 dark:hover:border-emerald-500/55 transition-all cursor-pointer shadow-lg shadow-gray-200/50 dark:shadow-none min-h-[260px] flex flex-col justify-between group"
              >
                <div>
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                     <MessageCircle className="h-7 w-7" />
                  </div>
                  <h4 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tighter mb-2">
                    WhatsApp dos Administradores
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed font-semibold">
                    Fale diretamente no WhatsApp do administrador oficial. Tire dúvidas de recargas, pagamentos ou verificação de conta instantaneamente.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-emerald-500">+244 926815124</span>
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1 group-hover:underline">
                    Conversar no WhatsApp <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* Direct In-App Chat Support */}
              <div 
                onClick={() => setViewMode('tickets')}
                className="bg-white dark:bg-zinc-950 p-7 md:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 hover:border-blue-600/55 dark:hover:border-blue-600/55 transition-all cursor-pointer shadow-lg shadow-gray-200/50 dark:shadow-none min-h-[260px] flex flex-col justify-between group"
              >
                <div>
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/20 group-hover:scale-110 transition-transform">
                     <MessageSquare className="h-7 w-7" />
                  </div>
                  <h4 className="text-lg md:text-xl font-black dark:text-white uppercase tracking-tighter mb-2">
                    Chat Direto no App
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed font-semibold">
                    Acompanhe todo o histórico de conversas e envie mensagens em tempo real directamente para a mesa de administração do FacePhone.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  {tickets.length > 0 ? (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full border border-blue-500/10">
                      {tickets.length} {tickets.length === 1 ? 'Sessão Ativa' : 'Sessões Ativas'}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600 font-mono text-[9.5px]">Sem chats pendentes</span>
                  )}
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-1 group-hover:underline">
                    Abrir Painel de Chat →
                  </span>
                </div>
              </div>

            </div>

            {/* FAQ Section */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-4">
                Principais Perguntas Frequentes (FAQ)
              </h3>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-950 rounded-[1.8rem] border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300">
                     <button 
                       onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                       className="w-full flex items-center justify-between p-5 md:p-6 text-left cursor-pointer"
                     >
                        <div className="flex items-center gap-4">
                           <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                              <faq.icon className="h-4 w-4" />
                           </div>
                           <span className="text-xs md:text-sm font-bold dark:text-white uppercase tracking-tight">{faq.q}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                     </button>
                     {activeFaq === i && (
                       <div className="px-6 pb-6 pt-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 leading-relaxed border-l-2 border-blue-600 dark:border-blue-500 pl-4 ml-3.5">
                            {faq.a}
                          </p>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* --- VIEW MODE: TICKETS LIST --- */}
        {viewMode === 'tickets' && !showNewTicketForm && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Conversas com Administradores</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-500 leading-none">Gerencie os chats directos iniciados com a administração.</p>
            </div>

            {tickets.length === 0 ? (
              <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 rounded-3xl p-10 text-center space-y-6 shadow-sm">
                <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-500/5 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-tight">Sem Conversas Ativas</h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed font-semibold">
                    Você não possui nenhum chat aberto com administradores no momento. Use o formulário direto para enviar uma mensagem.
                  </p>
                </div>
                <button 
                  onClick={() => setShowNewTicketForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer inline-block"
                >
                  Iniciar Nova Conversa Directa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {tickets.map((ticket) => {
                  const lastMsg = ticket.messages[ticket.messages.length - 1];
                  const hasResponse = lastMsg && lastMsg.senderId === 'SUPPORT';
                  
                  return (
                    <div 
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setViewMode('chat');
                      }}
                      className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 hover:border-blue-500/40 p-5 md:p-6 rounded-2xl cursor-pointer transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 group shadow-sm"
                    >
                      <div className="space-y-2 md:max-w-[70%]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {ticket.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {getCategoryLabel(ticket.category)}
                          </span>
                          {ticket.status === 'OPEN' ? (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 flex items-center gap-1.5 font-sans leading-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Ativo
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500">
                              Resolvido
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                          {ticket.subject}
                        </h4>
                        {lastMsg && (
                          <p className="text-xs text-gray-500 dark:text-zinc-500 line-clamp-1 italic">
                            Última mensagem: {lastMsg.text}
                          </p>
                        )}
                      </div>

                      <div className="text-left md:text-right shrink-0 flex flex-row md:flex-col justify-between md:justify-center gap-2 items-center md:items-end">
                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 dark:bg-transparent px-2 py-1 rounded-md md:p-0">
                          <Clock className="inline h-3.5 w-3.5 mr-1 align-text-bottom opacity-70" />
                          {new Date(ticket.updatedAt).toLocaleDateString()} {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {hasResponse && ticket.status === 'OPEN' && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-md text-center pointer-events-none self-start md:self-auto">
                            Admin Respondeu
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- DIALOG VIEW: NEW TICKET FORM --- */}
        {showNewTicketForm && (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/5 p-6 md:p-8 rounded-3xl shadow-lg space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight">Falar com Administrador</h3>
                <p className="text-xs text-gray-500 leading-none">Inicie um chat directo na central dos administradores oficiais.</p>
              </div>
              <button 
                onClick={() => setShowNewTicketForm(false)} 
                className="p-1 px-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Assunto / Tópico</label>
                  <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Ex: Minha Recarga de Kwanzas não caiu"
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tópico do Chamado</label>
                  <select 
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="TECHNICAL">Suporte Técnico</option>
                    <option value="BILLING">Financeiro / Recargas</option>
                    <option value="ABUSE">Denúncia de Abuso</option>
                    <option value="OTHER">Outros Assuntos</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Descreva detalhadamente sua dúvida / mensagem</label>
                <textarea 
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Por favor, forneça as referências, comprovativos, fotos ou detalhes..."
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                {isSubmitting ? 'Enviando ao Servidor...' : 'Iniciar Conversa Directa'}
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW MODE: DISCUSSING MAIN CHAT WINDOW --- */}
        {viewMode === 'chat' && selectedTicket && (
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-3xl shadow-xl flex flex-col h-[650px] overflow-hidden animate-fade-in">
            
            {/* Chat Room Head */}
            <div className="bg-slate-50 dark:bg-zinc-950 border-b border-gray-100 dark:border-white/5 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setViewMode('tickets')}
                  className="p-1 px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-xs font-black uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Sair
                </button>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-zinc-600">
                      ID-{selectedTicket.id.substring(0, 6).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                      {getCategoryLabel(selectedTicket.category)}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold uppercase line-clamp-1 max-w-[200px] md:max-w-[400px]">
                    {selectedTicket.subject}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.status === 'OPEN' ? (
                  <span className="text-[10px] font-black text-gray-950 dark:text-white uppercase tracking-widest bg-yellow-500/10 text-yellow-600 border border-yellow-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-sans leading-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" /> Chat Ativo
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    Resolvido
                  </span>
                )}
              </div>
            </div>

            {/* Chat Main Message Bubble Sandbox */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 bg-slate-50/50 dark:bg-[#08090d]">
              
              {/* Informative Security Advisory Banner */}
              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex items-start gap-3 max-w-2xl mx-auto text-left">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium leading-relaxed text-zinc-500">
                  <span className="font-extrabold text-blue-500 uppercase tracking-widest block mb-0.5">Canal de Transmissão Seguro</span>
                  Esta conversa é directa com a mesa de administração oficial. O FacePhone nunca solicita dados sigilosos, chaves privadas ou senhas.
                </p>
              </div>

              {selectedTicket.messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-zinc-900 text-[#0f172a] dark:text-zinc-100 rounded-bl-none border border-gray-100 dark:border-white/5'
                    }`}>
                      <div className="flex items-center justify-between gap-6 mb-1 border-b border-white/10 dark:border-white/5 pb-1">
                        <span className="text-[8px] font-black uppercase tracking-wider opacity-85">
                          {isMe ? 'Você (Usuário)' : 'Administrador do FacePhone'}
                        </span>
                        <span className="text-[8px] font-mono opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Response Form Sandbox */}
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-white/5 shrink-0">
              {selectedTicket.status === 'OPEN' ? (
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    maxLength={1000}
                    placeholder="Escreva a sua resposta oficial..."
                    className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    type="submit"
                    className="p-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center p-3.5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center justify-center gap-1">
                     Este chat foi finalizado e resolvido pelos administradores.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default SupportPage;
