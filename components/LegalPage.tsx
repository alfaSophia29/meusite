
import React from 'react';
import { ArrowLeftIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const content = type === 'terms' ? {
    title: 'Termos de Uso',
    icon: <DocumentTextIcon className="h-12 w-12 text-blue-500" />,
    description: 'Contrato de adesão e diretrizes de convivência na rede CyBerPhone.',
    sections: [
      {
        title: '1. Aceitação e Elegibilidade',
        text: 'Ao acessar o CyBerPhone, você declara ter pelo menos 18 anos ou possuir autorização legal dos responsáveis. O uso da plataforma implica na aceitação integral destes termos, leis locais e regulamentos internacionais de conduta digital.'
      },
      {
        title: '2. Conduta e Conteúdo Proibido',
        text: 'É terminantemente proibido publicar conteúdos que promovam discurso de ódio, violência, pornografia infantil, atividades ilegais ou desinformação. Nossa IA de moderação "Sentinel" monitora e remove automaticamente conteúdos que violem estes princípios para garantir a segurança da comunidade.'
      },
      {
        title: '3. Propriedade Intelectual e Licença',
        text: 'Você mantém os direitos sobre suas postagens, mas concede ao CyBerPhone uma licença irrevogável e global para hospedar, exibir e distribuir seu conteúdo no contexto dos serviços da rede social. O design e código da plataforma são propriedade exclusiva do CyBerPhone.'
      },
      {
        title: '4. Marketplace e Monetização',
        text: 'Ao participar do sistema de afiliados ou gerir uma loja, você concorda com nossas taxas de comissão e prazos de repasse. Vendas de produtos ilícitos ou golpes resultarão em suspensão imediata da conta e retenção de saldos para investigação.'
      },
      {
        title: '5. Moderação e Suspensão',
        text: 'O CyBerPhone reserva-se o direito de remover qualquer conteúdo ou suspender contas que prejudiquem a experiência de outros usuários ou a integridade técnica do sistema, sem aviso prévio, caso as violações sejam consideradas graves.'
      }
    ]
  } : {
    title: 'Política de Privacidade',
    icon: <ShieldCheckIcon className="h-12 w-12 text-green-500" />,
    description: 'Compromisso com a transparência e segurança total dos seus dados.',
    sections: [
      {
        title: '1. Coleta e Finalidade dos Dados',
        text: 'Coletamos dados de identificação (nome, e-mail, foto) e dados de uso (interações, localização se autorizado, metadados de mídia) com o objetivo exclusivo de personalizar seu feed, processar pagamentos de Marketplace e melhorar a IA de recomendação.'
      },
      {
        title: '2. Armazenamento e Criptografia',
        text: 'Todos os seus dados são armazenados em nuvem com criptografia de ponta-a-ponta. Informações de pagamento (cartões e transações) seguem os padrões de segurança bancários e não são visualizadas por nossa equipe interna.'
      },
      {
        title: '3. Seus Direitos (LGPD)',
        text: 'Você tem o direito de solicitar a exclusão total de seus dados, retificar informações incorretas ou exportar seu histórico de atividades em formato legível por máquinas. Estas solicitações podem ser feitas diretamente nas configurações da sua conta.'
      },
      {
        title: '4. Cookies e Tecnologias de Rastreamento',
        text: 'Utilizamos cookies essenciais para manter sua sessão ativa e tecnologias de análise para entender o engajamento do app. Não utilizamos rastreadores de terceiros para fins publicitários externos à plataforma sem seu consentimento.'
      },
      {
        title: '5. Compartilhamento Restrito',
        text: 'Seus dados pessoais nunca são vendidos. O compartilhamento ocorre apenas com prestadores de serviços essenciais (como gateways de pagamento) ou autoridades judiciais mediante ordem formal, conforme a legislação vigente.'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] font-sans flex flex-col items-center justify-center overflow-y-auto"
         style={{ 
           paddingTop: 'var(--safe-top)', 
           paddingBottom: 'var(--safe-bottom)',
           paddingLeft: 'var(--safe-left)',
           paddingRight: 'var(--safe-right)'
         }}>
      
      {/* Decorative Background for Desktop */}
      <div className="hidden lg:block fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#12161f] rounded-none md:rounded-[2.5rem] shadow-none md:shadow-2xl border-0 md:border md:border-gray-100 md:dark:border-white/5 overflow-hidden min-h-screen md:min-h-0 flex flex-col transition-all duration-500">
        <div className="p-8 md:p-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-brand transition-colors mb-8 font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Voltar
          </button>

          <div className="text-center mb-12">
            <div className="flex justify-center mb-4 opacity-80">
              {content.icon}
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{content.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{content.description}</p>
          </div>

          <div className="space-y-8">
            {content.sections.map((section, idx) => (
              <div key={idx} className="border-b border-gray-100 dark:border-white/5 pb-8 last:border-0">
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                  {section.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                  {section.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              Última atualização: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
