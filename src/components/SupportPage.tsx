import React, { useState } from 'react';
import { User } from '../types';
import { 
  ChatBubbleLeftRightIcon, 
  QuestionMarkCircleIcon, 
  EnvelopeIcon, 
  ChevronDownIcon,
  ShieldCheckIcon,
  TruckIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface SupportPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ currentUser, onNavigate }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Como funcionam os pagamentos?',
      a: 'Aceitamos pagamentos via Unitel Money e Criptomoedas (USDT) através da Cryptomus. Os pagamentos são processados instantaneamente.',
      icon: BanknotesIcon
    },
    {
      q: 'Como recebo meus produtos digitais?',
      a: 'Após a confirmação do pagamento, você receberá um e-mail com os dados de acesso e o conteúdo também ficará disponível na sua aba de "Minhas Compras".',
      icon: ShieldCheckIcon
    },
    {
      q: 'Qual o prazo de entrega para produtos físicos?',
      a: 'Para Luanda, entregamos entre 24h a 48h. Para as províncias, o prazo médio é de 3 a 7 dias úteis via nossas transportadoras parceiras.',
      icon: TruckIcon
    },
    {
      q: 'É seguro comprar no FacePhone?',
      a: 'Sim. Utilizamos tecnologia Escrow e verificação de identidade para garantir que seu dinheiro só chegue ao vendedor após a entrega confirmada.',
      icon: QuestionMarkCircleIcon
    }
  ];

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 bg-gray-50 dark:bg-[#0a0c10]">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Central de Ajuda</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Estamos aqui para <span className="text-blue-600 italic">ajudar</span></h2>
          <p className="text-gray-500 font-medium text-sm md:text-base max-w-xl mx-auto italic font-serif">"Nossa missão é garantir que sua experiência no FacePhone seja extraordinária."</p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-4 mb-6">Perguntas Frequentes</h3>
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300">
               <button 
                 onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                 className="w-full flex items-center justify-between p-6 text-left"
               >
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600">
                        <faq.icon className="h-5 w-5" />
                     </div>
                     <span className="text-sm font-black dark:text-white uppercase tracking-tight">{faq.q}</span>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
               </button>
               {activeFaq === i && (
                 <div className="px-6 pb-8 pt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed border-l-2 border-blue-600 pl-4 ml-6">{faq.a}</p>
                 </div>
               )}
            </div>
          ))}
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
           <div className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 group hover:border-blue-600 transition-all cursor-pointer" onClick={() => onNavigate('chat')}>
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-600/20 group-hover:scale-110 transition-transform">
                 <ChatBubbleLeftRightIcon className="h-7 w-7" />
              </div>
              <h4 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">Suporte via Chat</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">Fale com um de nossos atendentes agora mesmo.</p>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest group-hover:underline">Iniciar conversa →</span>
           </div>

           <div className="bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 group hover:border-blue-600 transition-all">
              <div className="w-14 h-14 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center text-gray-600 dark:text-white mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                 <EnvelopeIcon className="h-7 w-7" />
              </div>
              <h4 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">E-mail Oficial</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">Envie sua dúvida para nosso canal jurídico ou comercial.</p>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">contato@facephone.ao</span>
           </div>
        </div>
      </div>
    </div>
  );
};


export default SupportPage;
