
import React, { useState } from 'react';
import { User, GlobalSettings } from '../types';
import { uploadFile, updateUserData, checkFieldUniqueness, getGlobalSettings, processVerificationPayment } from '../services/storageService';
import { auditIdentityDocument } from '../services/geminiService';
import { 
  IdentificationIcon, 
  ChevronRightIcon, 
  CheckCircleIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface IDVerificationProps {
  user: User;
  onComplete: () => void;
  onLogout: () => void;
  forceUpdate?: boolean;
}

const IDVerification: React.FC<IDVerificationProps> = ({ user, onComplete, onLogout, forceUpdate }) => {
  const [step, setStep] = useState<'intro' | 'uploads' | 'pending'>(forceUpdate ? 'uploads' : 'intro');
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  React.useEffect(() => {
    getGlobalSettings().then(setSettings);
  }, []);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user already has a pending verification, try to process it automatically if they have docs
  React.useEffect(() => {
    if (user.idVerificationStatus === 'PENDING' && user.idVerificationDocs && !forceUpdate) {
      handleAutoVerifyExistingDocs();
    } else if (user.idVerificationStatus === 'PENDING' && !forceUpdate) {
      setStep('pending');
    }
  }, [user, forceUpdate]);

  const handleAutoVerifyExistingDocs = async () => {
    if (!user.idVerificationDocs || !user.idVerificationDocs.frontUrl || !user.idVerificationDocs.backUrl || !user.idVerificationDocs.selfieUrl) return;
    setIsUploading(true);
    setStep('pending');
    setError(null);

    try {
      const fetchAsFile = async (url: string, name: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], name, { type: blob.type });
      };

      const frontFile = await fetchAsFile(user.idVerificationDocs.frontUrl, 'front.jpg');
      const backFile = await fetchAsFile(user.idVerificationDocs.backUrl, 'back.jpg');
      const selfieFile = await fetchAsFile(user.idVerificationDocs.selfieUrl, 'selfie.jpg');

      const auditResult = await auditIdentityDocument(
        frontFile, 
        backFile, 
        selfieFile, 
        { 
          firstName: user.firstName, 
          lastName: user.lastName, 
          birthDate: user.birthDate, 
          documentId: user.documentId 
        }
      );

      if (auditResult.approved && auditResult.extractedData) {
        const { fullName, birthDate, expirationDate, documentNumber } = auditResult.extractedData;
        const { isPhysicalDocument, faceMatchScore } = auditResult.deepAnalysis;
        
        // Normalize document number
        const normalizedDocNumber = documentNumber.replace(/[^a-zA-Z0-9]/g, '');

        if (!isPhysicalDocument || faceMatchScore < 70) {
          throw new Error("Documento ou biometria inconsistente na auto-verificação.");
        }

        const expiryDateObj = new Date(expirationDate);
        const isExpired = expiryDateObj < new Date();

        if (isExpired) {
          throw new Error("Documento expirado na auto-verificação.");
        }

        // Verificação de Unicidade
        const isDocUnique = await checkFieldUniqueness('documentId', normalizedDocNumber);
        
        if (!isDocUnique && user.documentId !== normalizedDocNumber) {
           throw new Error("Duplicidade de documentos detectada.");
        }

        await updateUserData(user.id, {
          idVerificationStatus: 'APPROVED',
          isVerified: true,
          documentId: normalizedDocNumber,
          idVerificationDocs: {
            ...user.idVerificationDocs,
            expiresAt: expiryDateObj.getTime(),
          }
        });
        onComplete();
      } else {
        // Rejection logic
        await updateUserData(user.id, {
          idVerificationStatus: 'REJECTED',
          idVerificationDocs: {
            ...user.idVerificationDocs,
            rejectionReason: auditResult.reason || "Documento recusado na análise automática."
          }
        });
        // Stay in pending step so they see the button we added or refresh
        window.location.reload(); // Hard refresh to update user state
      }
    } catch (err: any) {
      console.error("Auto-verification error:", err);
      // Keep in pending state if error occurs
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === 'front') {
      setFrontImage(file);
      setFrontPreview(previewUrl);
    } else if (type === 'back') {
      setBackImage(file);
      setBackPreview(previewUrl);
    } else {
      setSelfieImage(file);
      setSelfiePreview(previewUrl);
    }
  };

  const handleFinish = async () => {
    if (!frontImage || !backImage || !selfieImage) {
      setError("Por favor, envie todos os documentos.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload files first
      const frontUrl = await uploadFile(frontImage, 'verifications');
      const backUrl = await uploadFile(backImage, 'verifications');
      const selfieUrl = await uploadFile(selfieImage, 'verifications');

      if (!frontUrl || !backUrl || !selfieUrl) throw new Error("Erro no upload dos arquivos.");

      // 2. Automated AI Audit
      const auditResult = await auditIdentityDocument(
        frontImage, 
        backImage, 
        selfieImage, 
        { 
          firstName: user.firstName, 
          lastName: user.lastName, 
          birthDate: user.birthDate, 
          documentId: user.documentId 
        }
      );

      if (auditResult.approved && auditResult.extractedData) {
        const { fullName, birthDate, expirationDate, documentNumber } = auditResult.extractedData;
        const { isPhysicalDocument, faceMatchScore } = auditResult.deepAnalysis;

        const userFullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        
        // Normalize document number (remove non-alphanumeric)
        const normalizedDocNumber = documentNumber.replace(/[^a-zA-Z0-9]/g, '');

        // Security check: must be a physical document
        if (!isPhysicalDocument) {
          throw new Error("A imagem parece ser uma foto de tela ou fotocópia. Por favor, tire uma foto do documento físico original.");
        }

        // Security check: face match score must be sufficient
        if (faceMatchScore < 70) {
          throw new Error("A selfie fornecida não coincide suficientemente com a foto no documento. Tente tirar a foto em um local mais iluminado.");
        }

        // Final sanity checks in code
        const nameMatches = fullName.toLowerCase().includes(user.firstName.toLowerCase()) || 
                            fullName.toLowerCase().includes(user.lastName.toLowerCase());
        
        const birthDateObj = new Date(birthDate);
        const userBirthDateObj = new Date(user.birthDate);
        const birthDateMatches = birthDateObj.getFullYear() === userBirthDateObj.getFullYear() &&
                                 birthDateObj.getMonth() === userBirthDateObj.getMonth() &&
                                 birthDateObj.getDate() === userBirthDateObj.getDate();

        const expiryDateObj = new Date(expirationDate);
        const isExpired = expiryDateObj < new Date();

        if (!nameMatches) {
          throw new Error(`O nome no documento ("${fullName}") não coincide com o nome da sua conta.`);
        }

        if (isExpired) {
          throw new Error("O documento enviado está expirado.");
        }

        // NOVO: Verificação de Unicidade do Documento extraído (comparação rigorosa)
        const isDocUnique = await checkFieldUniqueness('documentId', normalizedDocNumber);
        
        // Se já existe e não pertence ao usuário atual, rejeita
        if (!isDocUnique && user.documentId !== normalizedDocNumber) {
           throw new Error(`Este documento já está vinculado a outra conta.`);
        }

        // 3. Process Fee
        const paymentOk = await processVerificationPayment(user.id);
        if (!paymentOk) {
          throw new Error(`Saldo insuficiente para pagar a taxa de verificação ($${settings?.verificationFee || 20}).`);
        }

        // Automatic Approval
        await updateUserData(user.id, {
          idVerificationStatus: 'APPROVED',
          isVerified: true,
          documentId: normalizedDocNumber, // Salva o ID extraído
          idVerificationDocs: {
            frontUrl,
            backUrl,
            selfieUrl,
            submittedAt: Date.now(),
            expiresAt: expiryDateObj.getTime(),
            rejectionReason: null as any
          }
        });
        
        onComplete(); // Navigate out
      } else {
        // AI Rejected during audit
        setError(auditResult.reason || "Documento recusado na análise automática.");
        
        // Record rejection
        await updateUserData(user.id, {
          idVerificationStatus: 'REJECTED',
          idVerificationDocs: {
            frontUrl,
            backUrl,
            selfieUrl,
            submittedAt: Date.now(),
            expiresAt: null as any,
            rejectionReason: auditResult.reason
          }
        });
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Falha ao processar verificação. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0c10] flex flex-col items-center justify-center font-sans overflow-y-auto"
         style={{ 
           paddingTop: 'var(--safe-top)', 
           paddingBottom: 'var(--safe-bottom)',
           paddingLeft: 'var(--safe-left)',
           paddingRight: 'var(--safe-right)'
         }}>
      
      {/* Decorative Background for Desktop */}
      <div className="hidden lg:block fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#12161f] rounded-none md:rounded-[2.5rem] shadow-none md:shadow-2xl border-0 md:border md:border-gray-100 md:dark:border-white/5 p-6 sm:p-12 min-h-screen md:min-h-0 flex flex-col justify-center transition-all duration-500">
        {forceUpdate && (
          <div className="mb-8 p-6 bg-red-600/10 border border-red-600/20 rounded-3xl animate-pulse">
            <h3 className="text-red-500 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" /> Documento Expirado
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed">Sua verificação anterior expirou. Por favor, envie documentos atualizados para recuperar o acesso total à sua conta.</p>
          </div>
        )}
        {user.idVerificationStatus === 'REJECTED' && (
          <div className="mb-8 p-6 bg-red-600/10 border border-red-600/20 rounded-3xl">
            <h3 className="text-red-500 font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" /> Verificação Recusada
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed mb-4">Infelizmente sua verificação anterior foi recusada pelo seguinte motivo:</p>
            <div className="p-4 bg-red-600/20 rounded-2xl border border-red-600/30">
              <p className="text-red-400 text-xs font-black italic">"{user.idVerificationDocs?.rejectionReason || 'Dados do documento não conferem com o perfil.'}"</p>
            </div>
            <p className="text-gray-500 text-[9px] font-bold uppercase mt-4">Tente novamente com fotos mais nítidas e documentos válidos.</p>
          </div>
        )}
        {step === 'intro' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-4 bg-brand/10 rounded-3xl mb-6">
                <IdentificationIcon className="h-12 w-12 text-brand" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Verificação de Identidade</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Para garantir a segurança da nossa comunidade Cyber, precisamos verificar sua identidade antes de você começar a navegar.
              </p>
            </div>

            <div className="space-y-4">
              {settings?.verificationFee && settings.verificationFee > 0 && (
                <div className="bg-brand/5 border border-brand/20 p-5 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-brand/10 rounded-xl flex items-center justify-center">
                         <IdentificationIcon className="h-6 w-6 text-brand" />
                      </div>
                      <div>
                         <h4 className="text-xs font-black dark:text-white uppercase tracking-tight">Taxa de Verificação</h4>
                         <p className="text-[10px] text-gray-500 font-medium">Cobrança única para o selo de autenticidade.</p>
                      </div>
                   </div>
                   <span className="text-xl font-black text-brand">${settings.verificationFee.toFixed(2)}</span>
                </div>
              )}
              {[
                { title: 'Identidade ou CNH', desc: 'Frente e verso do seu documento oficial.' },
                { title: 'Foto de Rosto (Selfie)', desc: 'Uma foto segurando o documento ou apenas seu rosto.' },
                { title: 'Privacidade Total', desc: 'Seus dados são criptografados e destruídos após a verificação.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="h-6 w-6 bg-brand rounded-full flex items-center justify-center text-white text-xs font-black">{i + 1}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setStep('uploads')}
                className="w-full bg-brand hover:bg-brandHover text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex items-center justify-center gap-2 group shadow-xl shadow-brand/20"
              >
                Começar Verificação
                <ChevronRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onLogout}
                className="w-full py-4 text-gray-500 font-bold hover:text-brand transition-colors text-sm"
              >
                Sair e completar depois
              </button>
            </div>
          </div>
        )}

        {step === 'uploads' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Enviar Documentos</h2>
              <button onClick={() => setStep('intro')} className="p-2 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front */}
              <div className="relative group">
                <label className="block p-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl hover:border-brand transition-all cursor-pointer bg-gray-50/50 dark:bg-white/5">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} className="hidden" />
                  {frontPreview ? (
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                      <img src={frontPreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <CloudArrowUpIcon className="h-10 w-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <CloudArrowUpIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Frente do Documento</span>
                      <span className="text-[10px] text-gray-400 uppercase mt-1">Identidade ou CNH</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Back */}
              <div className="relative group">
                <label className="block p-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl hover:border-brand transition-all cursor-pointer bg-gray-50/50 dark:bg-white/5">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} className="hidden" />
                  {backPreview ? (
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                      <img src={backPreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <CloudArrowUpIcon className="h-10 w-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <CloudArrowUpIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Verso do Documento</span>
                      <span className="text-[10px] text-gray-400 uppercase mt-1">Identidade ou CNH</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Selfie */}
              <div className="md:col-span-2 relative group">
                <label className="block p-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl hover:border-brand transition-all cursor-pointer bg-white dark:bg-white/5 shadow-sm">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} className="hidden" />
                  {selfiePreview ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden max-h-48">
                      <img src={selfiePreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <CloudArrowUpIcon className="h-10 w-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 bg-gray-50 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                         <IdentificationIcon className="h-8 w-8 text-brand" />
                      </div>
                      <span className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter">Foto de Rosto (Selfie)</span>
                      <span className="text-xs text-gray-500 mt-2 text-center max-w-xs">Tire uma foto nítida do seu rosto em um ambiente iluminado.</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex gap-3 animate-shake">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
              </div>
            )}

            <button 
              onClick={handleFinish}
              disabled={isUploading || !frontImage || !backImage || !selfieImage}
              className={`w-full py-5 rounded-3xl font-black uppercase text-sm tracking-widest transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-3 ${
                isUploading || !frontImage || !backImage || !selfieImage 
                ? 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-brand text-white hover:bg-brandHover hover:-translate-y-1'
              }`}
            >
              {isUploading ? (
                <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Processando...</>
              ) : (
                'Concluir Verificação'
              )}
            </button>
          </div>
        )}

        {step === 'pending' && (
          <div className="text-center space-y-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-brand/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative h-32 w-32 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-brand/20">
                {isUploading ? (
                  <ArrowPathIcon className="h-16 w-16 text-brand animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-16 w-16 text-brand" />
                )}
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter uppercase">
                {isUploading ? 'Analisando Documentos' : 'Análise em Andamento'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
                {isUploading 
                  ? 'Aguarde um momento enquanto nossos sistemas de segurança validam suas informações em tempo real.'
                  : 'Recebemos seus documentos! Nosso sistema de auditoria está processando sua identidade para liberação imediata.'}
              </p>
            </div>

            <div className="bg-brand/5 dark:bg-white/5 p-6 rounded-[2.5rem] border border-brand/10">
               <div className="flex flex-col gap-4 text-left">
                  <div className="flex items-center gap-3">
                     <div className={`h-2 w-2 rounded-full ${isUploading ? 'bg-brand animate-pulse' : 'bg-yellow-500 animate-ping'}`}></div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${isUploading ? 'text-brand' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        Status: {isUploading ? 'Processando Auditoria' : 'Aguardando Validação'}
                     </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">
                    {isUploading 
                      ? 'Nossos servidores estão comparando sua selfie com o documento oficial.' 
                      : 'Isso geralmente leva poucos minutos com o nosso novo sistema de automação.'}
                  </p>
               </div>
            </div>

            {!isUploading && (
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={() => setStep('uploads')}
                  className="w-full bg-brand text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest transition-all hover:bg-brandHover shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                >
                  Refazer Verificação (Automática)
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                 <button 
                  onClick={onLogout}
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all hover:bg-gray-50"
                >
                  Sair da Conta
                </button>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] pt-4">CyBer Seguridade & Auditoria</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IDVerification;
