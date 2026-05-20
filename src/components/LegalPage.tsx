
import React from 'react';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';

interface LegalPageProps {
  type: 'terms' | 'privacy' | 'refunds';
  onBack: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  const content = {
    terms: {
      title: 'Termos de Uso',
      date: 'Maio 2024',
      sections: [
        {
          h: '1. Aceitação dos Termos',
          p: 'Ao utilizar a FacePhone, você concorda integralmente com estes termos. Nossa plataforma facilita o comércio social em Angola, permitindo a criação de lojas e venda de produtos.'
        },
        {
          h: '2. Responsabilidades do Vendedor',
          p: 'Vendedores são responsáveis pela veracidade das informações dos produtos, entrega e suporte ao cliente. É proibida a venda de itens ilegais ou que violem direitos autorais.'
        },
        {
          h: '3. Pagamentos e Taxas',
          p: 'Processamos pagamentos via Cryptomus (Criptomoedas) e Unitel Money. Taxas de serviço podem ser aplicadas sobre as vendas realizadas conforme o plano do vendedor.'
        },
        {
          h: '4. Propriedade Intelectual',
          p: 'Todo o conteúdo da plataforma é de propriedade da FacePhone ou de seus licenciadores. O uso indevido de marcas e patentes resultará no banimento da conta.'
        }
      ]
    },
    privacy: {
      title: 'Política de Privacidade',
      date: 'Maio 2024',
      sections: [
        {
          h: '1. Coleta de Dados',
          p: 'Coletamos informações básicas como nome, e-mail e dados de transação para garantir o funcionamento seguro da plataforma e processamento de pedidos.'
        },
        {
          h: '2. Uso de Informações',
          p: 'Seus dados são usados estritamente para suporte, segurança da conta e melhoria da experiência de compra. Jamais vendemos seus dados para terceiros.'
        },
        {
          h: '3. Segurança de Pagamento',
          p: 'Não armazenamos chaves privadas ou dados sensíveis de pagamento. Transações de cripto são processadas via gateways seguros com criptografia de ponta.'
        },
        {
          h: '4. Cookies e Tecnologias',
          p: 'Utilizamos cookies para manter sua sessão ativa e salvar suas preferências de idioma e tema dark/light.'
        }
      ]
    },
    refunds: {
      title: 'Política de Reembolso e Entrega',
      date: 'Maio 2024',
      sections: [
        {
          h: '1. Processo de Entrega',
          p: 'Para produtos físicos, o prazo médio de entrega em Luanda é de 24h a 48h. Para outras províncias, pode variar de 3 a 7 dias úteis.'
        },
        {
          h: '2. Produtos Digitais',
          p: 'Produtos digitais e cursos são entregues instantaneamente via e-mail ou área do aluno após a confirmação do pagamento. Não há reembolso para itens digitais já baixados.'
        },
        {
          h: '3. Condições de Devolução',
          p: 'O comprador tem até 7 dias após o recebimento para solicitar a devolução de produtos físicos em caso de defeito ou arrependimento, desde que o item esteja lacrado.'
        },
        {
          h: '4. Reembolsos',
          p: 'O reembolso será processado via o mesmo método de pagamento utilizado. Em criptomoedas, o valor será baseado na cotação do momento da aprovação do reembolso.'
        }
      ]
    }
  };

  const active = content[type];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] p-6 pt-24 md:pt-32 pb-20">
      <div className="max-w-2xl mx-auto">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors group"
          >
            <div className="p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <ChevronLeftIcon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
          </button>

          <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4 italic">
            {active.title}
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-12">Última atualização: {active.date}</p>
          
          <div className="space-y-10">
              {active.sections.map((s, i) => (
                <div key={i} className="space-y-3">
                   <h4 className="text-sm font-black dark:text-white uppercase tracking-widest text-blue-600">{s.h}</h4>
                   <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed text-sm">{s.p}</p>
                </div>
              ))}
          </div>
          
          <div className="mt-16 p-8 bg-gray-100 dark:bg-white/5 rounded-[2.5rem] border dark:border-white/5 text-center">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dúvidas Jurídicas?</p>
             <p className="text-xs font-bold dark:text-white">contato@facephone.ao</p>
          </div>
      </div>
    </div>
  );
};

export default LegalPage;
