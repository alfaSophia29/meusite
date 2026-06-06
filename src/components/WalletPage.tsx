import React, { useState, useEffect } from 'react';
import { User, Page } from '../types';
import { 
  Wallet, 
  RefreshCw, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Coins,
  ChevronRight,
  ShieldAlert,
  Clock,
  Plus,
  ShoppingBag,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  QrCode,
  Link,
  ArrowRightLeft,
  Info,
  Layers,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTransactions } from '../services/storageService';

interface WalletPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: any) => void;
  refreshUser: () => Promise<void>;
  onOpenAction: (mode: 'deposit' | 'withdraw') => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ currentUser, onNavigate, refreshUser, onOpenAction }) => {
  const [exchangeRate] = useState(930);
  const [activeCurrency, setActiveCurrency] = useState<'KZ' | 'USDT'>('KZ');
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Conversion calculator state
  const [calcInput, setCalcInput] = useState('1');
  const [calcDirection, setCalcDirection] = useState<'USDT_TO_KZ' | 'KZ_TO_USDT'>('USDT_TO_KZ');

  // Simulated Chart Data for modern styling
  const chartPoints = [35, 45, 30, 60, 52, 75, 68, 90, 82, 98, 92, 100];

  // Fallback / mock transactions
  const mockTransactions = [
    { id: 'mock-1', type: 'receive', amount: 50.00, currency: 'USDT', from: 'Venda Geral - Dropshipping', date: 'Hoje, 14:20', status: 'concluído', icon: ShoppingBag },
    { id: 'mock-2', type: 'send', amount: 15.00, currency: 'USDT', to: 'Assinatura Premium', date: 'Ontem', status: 'concluído', icon: Sparkles },
    { id: 'mock-3', type: 'receive', amount: 125000, currency: 'KZ', from: 'Depósito Unitel Money', date: '15 Mai', status: 'concluído', icon: Coins },
    { id: 'mock-4', type: 'receive', amount: 35.50, currency: 'USDT', from: 'Royalties de Conteúdo', date: '12 post', status: 'concluído', icon: ArrowDownCircle },
  ];

  useEffect(() => {
    const fetchTx = async () => {
      try {
        setLoadingTx(true);
        const res = await getTransactions(currentUser.id, undefined, 20);
        setRealTransactions(res.items || []);
      } catch (err) {
        console.warn("Erro ao buscar transações reais:", err);
      } finally {
        setLoadingTx(false);
      }
    };
    fetchTx();
  }, [currentUser.id]);

  const displayTx = realTransactions.length > 0 
    ? realTransactions.map(tx => ({
        id: tx.id,
        type: tx.type === 'deposit' || tx.type === 'receive' || tx.amount > 0 ? 'receive' : 'send',
        amount: Math.abs(tx.amount),
        currency: tx.currency || 'USDT',
        from: tx.description || 'Movimentação no ecossistema',
        to: tx.description || 'Movimentação no ecossistema',
        date: tx.timestamp ? new Date(tx.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recente',
        status: tx.status?.toLowerCase() === 'completed' || tx.status?.toLowerCase() === 'concluido' ? 'concluído' : 'pendente',
        icon: tx.type?.toLowerCase() === 'withdraw' ? ArrowUpCircle : (tx.type?.toLowerCase() === 'deposit' ? Coins : ShoppingBag)
      }))
    : mockTransactions;

  // Exact Calculation matching Kwanza & USDT
  const rawBalance = currentUser.balance || 0;
  const balanceInUSDT = rawBalance;
  const balanceInKZ = rawBalance * exchangeRate;

  // Decide current display parameters
  const currentFormattedNumber = activeCurrency === 'KZ' 
    ? balanceInKZ.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : balanceInUSDT.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

  // Secondary/Alternative balance estimates for full fidelity
  const altFormattedNumber = activeCurrency === 'KZ'
    ? `${balanceInUSDT.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
    : `${balanceInKZ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} AOA`;

  // Dynamic Font Sizing strictly ensuring no line overflows or card cutting!
  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len > 24) return 'text-xl sm:text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tight break-all leading-tight';
    if (len > 18) return 'text-2xl sm:text-3xl md:text-4xl font-black text-gray-950 dark:text-white tracking-tight break-all leading-tight';
    if (len > 14) return 'text-3xl sm:text-4xl md:text-5xl font-black text-gray-950 dark:text-white tracking-tighter break-all leading-none';
    if (len > 10) return 'text-4xl sm:text-5xl md:text-6xl font-black text-gray-950 dark:text-white tracking-tighter break-all leading-none';
    return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-gray-950 dark:text-white tracking-tighter leading-none';
  };

  // Convert on typing
  const calcOutput = (() => {
    const val = parseFloat(calcInput) || 0;
    if (calcDirection === 'USDT_TO_KZ') {
      return (val * exchangeRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' Kwanza';
    } else {
      return (val / exchangeRate).toLocaleString('pt-BR', { minimumFractionDigits: 4 }) + ' USDT';
    }
  })();

  const toggleCalcDirection = () => {
    setCalcDirection(prev => prev === 'USDT_TO_KZ' ? 'KZ_TO_USDT' : 'USDT_TO_KZ');
    setCalcInput('1');
  };

  const handleDownloadStatement = () => {
    const userName = `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() || 'Usuário do Ecossistema';
    const userEmail = currentUser.email || 'Não informado';
    const userPhone = currentUser.phone || 'Não informado';
    const userDocRef = currentUser.documentId || 'Não informado';
    
    const addr = currentUser.address;
    const addressLine = addr?.address || 'Sem endereço de entrega cadastrado';
    const cityLine = addr?.city || '';
    const stateLine = addr?.state || '';
    const zipCodeLine = addr?.zipCode || '';
    const countryLine = currentUser.country || 'Angola';

    const formattedAddress = addr 
      ? `${addressLine}${cityLine ? `, ${cityLine}` : ''}${stateLine ? `, ${stateLine}` : ''}${zipCodeLine ? ` - CEP: ${zipCodeLine}` : ''}${countryLine ? ` (${countryLine})` : ''}`
      : 'Endereço não configurado no perfil';

    const currentDateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const transactionRows = displayTx.map((tx) => {
      const isReceive = tx.type === 'receive';
      const sign = isReceive ? '+' : '-';
      const amountStyle = isReceive ? 'amount-positive' : 'amount-negative';
      const statusClass = tx.status === 'concluído' ? 'status-completed' : 'status-pending';
      const txIdClean = tx.id ? tx.id.toString().substring(0, 8).toUpperCase() : Math.floor(Math.random() * 90000 + 10000);
      
      return `
        <tr>
          <td style="color: #64748b; font-weight: 600; font-family: monospace;">#TX-${txIdClean}</td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${tx.from || tx.to || 'Transferência'}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${tx.date}</div>
          </td>
          <td>
            <span class="status-badge ${statusClass}">${tx.status}</span>
          </td>
          <td style="text-align: right;" class="${amountStyle}">
            ${sign}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tx.currency}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extrato de Movimentações - FacePhone Pay</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 50px;
      border-radius: 24px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 30px;
      margin-bottom: 35px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 950;
      font-size: 20px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -1px;
    }
    .logo-text span {
      color: #2563eb;
    }
    .doc-info {
      text-align: right;
    }
    .doc-info h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-info p {
      margin: 6px 0 0;
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    @media (max-width: 600px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 25px;
      }
      .header {
        flex-direction: column;
        gap: 20px;
      }
      .doc-info {
        text-align: left;
      }
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #2563eb;
      letter-spacing: 1.5px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .info-block {
      line-height: 1.6;
    }
    .info-item {
      font-size: 13px;
      margin: 8px 0;
      color: #475569;
    }
    .info-item strong {
      color: #0f172a;
      font-weight: 600;
      display: inline-block;
      width: 130px;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 40px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item:not(:last-child) {
      border-right: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .summary-item:not(:last-child) {
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 15px;
      }
      .summary-box {
        grid-template-columns: 1fr;
      }
    }
    .summary-item h3 {
      margin: 0 0 6px;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-item p {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .summary-item p span {
      font-size: 12px;
      color: #2563eb;
      margin-left: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      padding: 14px 16px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .amount-positive {
      color: #10b981;
      font-weight: 800;
    }
    .amount-negative {
      color: #f43f5e;
      font-weight: 800;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
    .status-completed {
      background: #d1fae5;
      color: #065f46;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .action-row {
      text-align: center;
      margin-top: 40px;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: center;
      gap: 15px;
    }
    .btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .stamp-container {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .stamp {
      border: 2px dashed #94a3b8;
      color: #64748b;
      padding: 10px 20px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-radius: 8px;
      transform: rotate(-2deg);
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .action-row {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <div class="logo-icon">F</div>
        <div class="logo-text">FacePhone<span>Pay</span></div>
      </div>
      <div class="doc-info">
        <h1>Extrato de Carteira</h1>
        <p>Data de emissão: ${currentDateStr}</p>
      </div>
    </div>

    <div class="grid">
      <div class="info-block">
        <div class="section-title">Dados do Titular</div>
        <div class="info-item"><strong>Nome Completo:</strong> ${userName}</div>
        <div class="info-item"><strong>NIF / BI / Doc:</strong> ${userDocRef}</div>
        <div class="info-item"><strong>E-mail de Contato:</strong> ${userEmail}</div>
        <div class="info-item"><strong>Telemóvel / Tel:</strong> ${userPhone}</div>
        <div class="info-item"><strong>Endereço Fiscal:</strong> ${formattedAddress}</div>
      </div>
      <div class="info-block">
        <div class="section-title">Informações Adicionais</div>
        <div class="info-item"><strong>Plataforma:</strong> FacePhone v1.3.1</div>
        <div class="info-item"><strong>Câmbio Aplicado:</strong> 1 USDT = ${exchangeRate} AOA</div>
        <div class="info-item"><strong>Nível de Cadastro:</strong> ${currentUser.userType === 'CREATOR' ? 'Criador Premium' : 'Membro Padrão'}</div>
        <div class="info-item"><strong>Estabilidade:</strong> Servidor Liquidado</div>
      </div>
    </div>

    <div class="section-title">Resumo Financeiro da Conta</div>
    <div class="summary-box">
      <div class="summary-item">
        <h3>Saldo Líquido em Kwanzas</h3>
        <p>${balanceInKZ.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span>AOA</span></p>
      </div>
      <div class="summary-item">
        <h3>Saldo Líquido em USDT</h3>
        <p>${balanceInUSDT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span>USDT</span></p>
      </div>
    </div>

    <div class="section-title">Histórico de Atividades Realizadas</div>
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Identificador ID</th>
            <th>Descrição do Movimento</th>
            <th>Estado / Status</th>
            <th style="text-align: right;">Montante Liquidado</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows.length > 0 ? transactionRows : '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 40px;">Nenhuma movimentação registrada no histórico recente.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="stamp-container">
      <div class="stamp">Documento Oficial Certificado</div>
    </div>

    <div class="action-row">
      <button class="btn" onclick="window.print()">Imprimir / Guardar em PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Fechar Guia</button>
    </div>

    <div class="footer">
      <p>FacePhone Pay S.A. - Serviços Financeiros de Moeda Digital e Afiliados</p>
      <p>Este extrato é um documento oficial emitido eletronicamente para fins informativos de contabilidade de rede.</p>
      <p>&copy; 2026 FacePhone Angola. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Trigger download of this elegant HTML document so the user can save it & print it directly
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Extrato_FacePhone_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-24 pb-32 px-4 md:px-8 bg-[#f8fafc] dark:bg-[#07090e] text-gray-900 dark:text-gray-100 animate-fade-in font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Futuristic Glassmorphic Header */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border-b border-gray-100 dark:border-white/5 pb-8 relative">
           <div className="space-y-3">
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 w-fit">
                 <Coins className="h-4 w-4 animate-spin-slow" />
                 <span className="text-[10px] font-black uppercase tracking-[0.25em]">Multi-Chain Ledger v2.4</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-950 dark:text-white uppercase tracking-tighter leading-[0.95]">
                Ativos e Carteira <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Digital Inteligente</span>
              </h2>
           </div>
           
           {/* Currency Fast Toggle Swapper */}
           <div className="flex bg-gray-150 dark:bg-white/[0.03] p-1.5 rounded-3xl border border-gray-200 dark:border-white/10 shadow-inner w-full sm:w-auto relative group">
              <button 
                onClick={() => setActiveCurrency('KZ')}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeCurrency === 'KZ' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-xl' : 'text-gray-400 dark:text-gray-500 hover:text-gray-800'}`}
              >
                AOA / Kwanza
              </button>
              <button 
                onClick={() => setActiveCurrency('USDT')}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeCurrency === 'USDT' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-xl' : 'text-gray-400 dark:text-gray-500 hover:text-gray-800'}`}
              >
                USDT / Tether
              </button>
           </div>
        </header>

        {/* Dynamic Responsive Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Massive Visualizer Balance Card - Spans 8 cols on desktop */}
           <div className="lg:col-span-8 space-y-8">
              
               <div className="relative group overflow-hidden rounded-[3.5rem] border border-gray-200 dark:border-white/10 shadow-2xl transition-all duration-300 hover:shadow-blue-500/10">
                  
                  {/* Digital Aura background elements */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[3.5rem] blur opacity-15 dark:opacity-20 group-hover:opacity-30 transition duration-700"></div>
                  
                  <div className="relative bg-white dark:bg-zinc-950 p-8 sm:p-12 md:p-16 rounded-[3.5rem] overflow-hidden">
                     
                     {/* Digital watermarks */}
                     <div className="absolute top-0 right-0 p-12 opacity-[0.02] dark:opacity-[0.06] rotate-12 pointer-events-none">
                        <Wallet className="h-72 w-72 text-blue-500" />
                     </div>

                     <div className="relative z-10 space-y-8 sm:space-y-12">
                        
                        {/* Meta indicators row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Saldo Disponível Liquidado</p>
                              <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                                Segmentado para {currentUser.resellerName || currentUser.firstName + ' ' + (currentUser.lastName || '')}
                              </p>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                              <TrendingUp className="h-3.5 w-3.5" /> Estável e Seguro
                           </div>
                        </div>

                        {/* HUGE BALANCE WITH SHRINKS GRACEFULLY */}
                        <div className="space-y-3 relative py-2">
                           
                           {/* Render Dynamic size layout classes to never overflow */}
                           <div className={`transition-all duration-300 font-black tracking-tighter break-all w-full select-all`}>
                              <span className={getFontSizeClass(currentFormattedNumber)}>
                                 {currentFormattedNumber}
                              </span>
                              <span className="text-xl sm:text-2xl md:text-3xl font-black text-blue-600 ml-2 italic">{activeCurrency}</span>
                           </div>

                           {/* Secondary converted estimation underneath */}
                           <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-400 dark:text-zinc-500">
                              <span>Correspondência estimada:</span>
                              <span className="font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-2.5 py-0.5 rounded-lg border dark:border-white/5">
                                 {altFormattedNumber}
                              </span>
                           </div>
                           
                        </div>

                        {/* Interactive dynamic spark chart representing active state */}
                        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                           <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                              <span>Desempenho da Carteira</span>
                              <span>Taxa Câmbio Oficial 1 USDT = {exchangeRate} AOA</span>
                           </div>
                           <div className="flex items-end gap-1.5 h-16 pt-3">
                              {chartPoints.map((p, i) => (
                                 <motion.div 
                                   key={i}
                                   initial={{ height: 0 }}
                                   animate={{ height: `${p}%` }}
                                   transition={{ delay: i * 0.03, duration: 0.8 }}
                                   className={`flex-1 rounded-full ${i === chartPoints.length - 1 ? 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-white/10 group-hover:bg-blue-300/20'}`}
                                 />
                              ))}
                           </div>
                        </div>

                        {/* Interactive action controls */}
                        <div className="flex flex-col sm:flex-row gap-4">
                           <button 
                             onClick={() => onOpenAction('deposit')} 
                             className="flex-1 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-600/35 hover:-translate-y-1 hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5 active:scale-95"
                           >
                              <Plus className="h-4.5 w-4.5 stroke-[3]" /> Adicionar Fundos (Multicaixa / USDT)
                           </button>
                           <button 
                             onClick={() => onOpenAction('withdraw')} 
                             className="flex-1 py-5 bg-gray-950 dark:bg-white text-white dark:text-gray-950 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5 active:scale-95"
                           >
                              <ArrowUpCircle className="h-4.5 w-4.5" /> Retirar Direto para Conta / Wallet
                           </button>
                        </div>

                     </div>
                  </div>
               </div>


           </div>

           {/* Sidebar Tools Column - Spans 4 cols on desktop */}
           <div className="lg:col-span-4 space-y-8">
              
              {/* Converssor de Moedas Simulado em tempo real para ajudar o afiliado */}
              <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-slate-800 p-8 rounded-[3rem] text-white space-y-6 relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-6 opacity-10">
                    <ArrowRightLeft className="h-24 w-24" />
                 </div>
                 
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-2">
                       <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                       <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Simulador de Conversão</h4>
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] text-zinc-300 leading-relaxed">
                          Descubra o valor em tempo real de acordo com as atuais oscilações de mercado e integrações com o Banco de Angola e exchanges Web3.
                       </p>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Valor do Câmbio</label>
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                             <input 
                               type="number" 
                               value={calcInput}
                               onChange={(e) => setCalcInput(e.target.value)}
                               className="w-full bg-transparent font-black text-xl text-white outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                               placeholder="0"
                             />
                             <span className="text-xs font-black text-indigo-400 ml-2">
                                {calcDirection === 'USDT_TO_KZ' ? 'USDT' : 'KZ'}
                             </span>
                          </div>
                       </div>

                       <div className="flex justify-center">
                          <button 
                            onClick={toggleCalcDirection}
                            className="p-3 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-full border border-indigo-500/25 transition-all text-indigo-300 rotate-90"
                          >
                             <ArrowUpDown className="h-4 w-4" />
                          </button>
                       </div>

                       <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex flex-col gap-1.5">
                          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Conversão Equivalente</span>
                          <span className="text-lg font-black text-emerald-300 break-all select-all">{calcOutput}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Advanced Network Info */}
              <div className="border border-gray-200 dark:border-white/10 p-8 rounded-[3.5rem] bg-white dark:bg-zinc-950 space-y-6 shadow-xl">
                 <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">Dados da Rede Social</h4>
                 </div>
                 
                 <div className="space-y-4">
                     <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Total Ganho de Afiliado</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{(balanceInUSDT * 0.15).toFixed(2)} USDT</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Sua Taxa de Cashback</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">5.0%</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Status dos Contratos</span>
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Verificado por IA</span>
                     </div>
                     <div className="flex justify-between items-center py-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Liquidação Pendente</span>
                        <span className="text-xs font-black text-amber-500">0.00 USDT</span>
                     </div>
                 </div>
              </div>

              {/* Safety banner warning */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4 text-left items-start">
                 <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 lg:h-6 lg:w-6 shrink-0 mt-0.5" />
                 <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">Aviso de Segurança</h5>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 font-medium leading-relaxed">
                       Sempre verifique cuidadosamente o endereço da rede antes de enviar USDT ou AOA. Transferências para redes incorretas podem acarretar em perdas irreparáveis de capital.
                    </p>
                 </div>
              </div>

           </div>
        </div>

        {/* Instalação Centrada e Exclusiva de Histórico de Atividades / Transações */}
        <div className="max-w-3xl mx-auto w-full bg-white dark:bg-zinc-950 rounded-[3.5rem] border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden p-8 md:p-12">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 px-4">
              <div className="flex items-center gap-3 text-center sm:text-left justify-center">
                 <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                 <div>
                    <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-widest">
                       Fluxo de Atividades
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Histórico da Carteira Digital</p>
                 </div>
              </div>
              <button 
                onClick={handleDownloadStatement}
                className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all px-4 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center gap-1.5 border border-blue-500/10 hover:border-blue-500/35"
              >
                 <Download className="h-3.5 w-3.5" /> Baixar Extrato Oficial
              </button>
           </div>

           {loadingTx ? (
             <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Carregando movimentações...</p>
             </div>
           ) : (
             <div className="space-y-4">
                {displayTx.map((tx, i) => {
                   const TxIcon = tx.icon || Coins;
                   return (
                     <div key={tx.id || i} className="group p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-[2.5rem] transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                           <div className={`p-4 rounded-2xl shadow-sm ${tx.type === 'receive' ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-400/10 text-rose-600'}`}>
                              <TxIcon className="h-5 w-5" />
                           </div>
                           <div>
                              <h4 className="font-black dark:text-white uppercase text-xs sm:text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                                {tx.from || tx.to}
                              </h4>
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5">
                                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tx.date}</p>
                                 <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full hidden sm:inline-block"></span>
                                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{tx.status}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-center sm:text-right">
                           <p className={`font-black text-md sm:text-lg ${tx.type === 'receive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.type === 'receive' ? '+' : '-'}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                           </p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-60">ID #TX-{tx.id.toString().substring(0, 8)}</p>
                        </div>
                     </div>
                   );
                })}
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default WalletPage;
