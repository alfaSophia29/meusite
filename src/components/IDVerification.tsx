
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from '../types';
import { UserIcon, ShieldCheckIcon, IdentificationIcon, CameraIcon, ArrowRightOnRectangleIcon, CheckBadgeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { updateUserVerificationDocs, checkFieldUniqueness, registerUniqueness, uploadFile } from '../services/storageService';
import { extractIDInfo, verifyUserIdentityWithAI } from '../services/geminiService';

interface IDVerificationProps {
  user: User;
  onComplete: () => void;
  onLogout: () => void;
  forceUpdate?: boolean;
}

type VerificationStep = 'intro' | 'front' | 'back' | 'selfie' | 'processing' | 'confirm' | 'pending' | 'error' | 'approved';

const IDVerification: React.FC<IDVerificationProps> = ({ user, onComplete, onLogout, forceUpdate }) => {
  const [step, setStep] = useState<VerificationStep>(() => {
    if (user.idVerificationStatus === 'PENDING' && !forceUpdate) return 'pending';
    return 'intro';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);

  // Previews based on files
  const frontPreview = useMemo(() => frontImage ? URL.createObjectURL(frontImage) : null, [frontImage]);
  const backPreview = useMemo(() => backImage ? URL.createObjectURL(backImage) : null, [backImage]);
  const selfiePreview = useMemo(() => selfieImage ? URL.createObjectURL(selfieImage) : null, [selfieImage]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [frontPreview, backPreview, selfiePreview]);

  const [extractedInfo, setExtractedInfo] = useState<{ firstName: string; lastName: string; documentId: string; birthDate: string } | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => setStep('front');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back' | 'selfie') => {
    const file = e.target.files?.[0];
    if (file) {
      if (side === 'front') setFrontImage(file);
      else if (side === 'back') setBackImage(file);
      else setSelfieImage(file);
    }
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage || !selfieImage) {
      setError("Por favor, capture todas as fotos necessárias.");
      return;
    }

    setLoading(true);
    setStep('processing');
    setError(null);

    try {
      // 1. Convert to base64 for Gemini
      const frontB64 = await toBase64(frontImage);
      const backB64 = await toBase64(backImage);

      // 2. OCR with Gemini
      const info = await extractIDInfo(frontB64, backB64);
      
      if (!info || !info.documentId) {
        throw new Error("Não foi possível ler as informações do documento. Tente novamente com mais claridade e foco nas fotos.");
      }

      setExtractedInfo(info);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro durante a leitura do documento.");
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!frontImage || !backImage || !selfieImage || !extractedInfo) return;

    setLoading(true);
    setStep('processing');
    setError(null);

    try {
      // 3. Uniqueness Check
      const isUnique = await checkFieldUniqueness('documentId', extractedInfo.documentId);
      if (!isUnique) {
        throw new Error("Este documento já está vinculado a outra conta da FacePhone.");
      }

      // Convert images to base64 for IA KYC comparison
      const frontB64 = await toBase64(frontImage);
      const backB64 = await toBase64(backImage);
      const selfieB64 = await toBase64(selfieImage);

      // Perform AI verification
      const aiResult = await verifyUserIdentityWithAI(frontB64, backB64, selfieB64);

      // 4. Upload images
      const frontUrl = await uploadFile(frontImage, 'verifications/front');
      const backUrl = await uploadFile(backImage, 'verifications/back');
      const selfieUrl = await uploadFile(selfieImage, 'verifications/selfie');

      // 5. Update user and register document uniqueness
      await registerUniqueness('documentId', extractedInfo.documentId, user.id);
      
      const birthDateTimestamp = extractedInfo.birthDate ? new Date(extractedInfo.birthDate).getTime() : Date.now();
      const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;

      if (aiResult.approved) {
        await updateUserVerificationDocs(user.id, {
          frontUrl,
          backUrl,
          selfieUrl,
          submittedAt: Date.now(),
          expiresAt: Date.now() + twoYearsInMs,
          rejectionReason: ""
        }, {
          firstName: extractedInfo.firstName || user.firstName,
          lastName: extractedInfo.lastName || user.lastName,
          documentId: extractedInfo.documentId,
          birthDate: birthDateTimestamp,
          idVerificationStatus: 'APPROVED',
          isVerified: true
        });

        setStep('approved');
      } else {
        await updateUserVerificationDocs(user.id, {
          frontUrl,
          backUrl,
          selfieUrl,
          submittedAt: Date.now(),
          expiresAt: Date.now() + twoYearsInMs,
          rejectionReason: aiResult.reason
        }, {
          firstName: extractedInfo.firstName || user.firstName,
          lastName: extractedInfo.lastName || user.lastName,
          documentId: extractedInfo.documentId,
          birthDate: birthDateTimestamp,
          idVerificationStatus: 'REJECTED',
          isVerified: false
        });

        setError(aiResult.reason || "Seu documento foi rejeitado pela nossa IA.");
        setStep('error');
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar os dados.");
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'processing') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 animate-fade-in text-center">
        <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
           <div className="h-20 w-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-8"></div>
           <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Análise em Andamento</h2>
           <p className="text-gray-500 text-sm font-medium mb-4">
             Nossa Inteligência Artificial está analisando suas fotos, validando as informações do documento e efetuando a comparação facial da selfie...
           </p>
           <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest animate-pulse">Este processo leva alguns segundos</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 animate-fade-in text-center">
          <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
             <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <ExclamationTriangleIcon className="h-10 w-10" />
             </div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Não Aprovado pela IA</h2>
             <p className="text-gray-500 text-sm font-medium mb-8 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
               {error || "Seus documentos foram rejeitados pela nossa Inteligência Artificial."}
             </p>
             <button onClick={() => setStep('front')} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mb-4">
               Tentar Novamente
             </button>
             <button onClick={onLogout} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors">Sair da Conta</button>
          </div>
        </div>
      );
  }

  if (step === 'approved') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 animate-fade-in text-center">
        <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckBadgeIcon className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Aprovado pela IA!</h2>
          <p className="text-gray-500 text-sm font-medium mb-8">
            Nossa Inteligência Artificial autenticou com sucesso seus documentos e confirmou a compatibilidade da selfie. Sua conta está agora totalmente verificada!
          </p>
          <button onClick={onComplete} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mb-4">
            Acessar Plataforma
          </button>
        </div>
      </div>
    );
  }

  if (step === 'pending') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 animate-fade-in text-center">
        <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Verificação Enviada</h2>
          <p className="text-gray-500 text-sm font-medium mb-8">
            Seus dados foram extraídos via IA e estão em análise final. Você receberá uma notificação assim que for aprovado.
          </p>
          <button onClick={onLogout} className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
            <ArrowRightOnRectangleIcon className="h-5 w-5" /> Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 animate-fade-in">
      <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-md w-full">
        {step === 'intro' && (
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <IdentificationIcon className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">
              {forceUpdate ? "Renovação Necessária" : "Verificação Inteligente"}
            </h2>
            <p className="text-gray-500 text-sm font-medium mb-8">
              {forceUpdate 
                ? "Seu documento de identidade expirou ou precisa ser atualizado. Por favor, realize o processo novamente para manter sua conta ativa." 
                : "Utilizamos Inteligência Artificial para verificar seus documentos e garantir a segurança da rede."}
            </p>
            
            {user.idVerificationStatus === 'REJECTED' && user.idVerificationDocs?.rejectionReason && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl text-[10px] font-black uppercase border border-red-100 dark:border-red-900/30 text-left">
                <p className="text-red-500 mb-1">Motivo da Rejeição:</p>
                <p className="dark:text-white">{user.idVerificationDocs.rejectionReason}</p>
              </div>
            )}
            <div className="space-y-3 mb-10 text-left">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                 <CheckBadgeIcon className="h-5 w-5 text-blue-600" />
                 <p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400">Verificação Única & Intransferível</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                 <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                 <p className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400">Dados Protegidos por IA Militar</p>
              </div>
            </div>
            <button onClick={handleStart} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all mb-4">
              Começar Agora
            </button>
            <button onClick={onLogout} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors">Cancelar e Sair</button>
          </div>
        )}

        {step === 'confirm' && extractedInfo && (
          <div className="animate-fade-in text-center">
             <div className="bg-green-50 dark:bg-green-600/10 text-green-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <CheckBadgeIcon className="h-10 w-10" />
             </div>
             <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">Dados Extraídos</h3>
             <p className="text-gray-500 text-xs font-medium mb-8">Nossa IA conseguiu ler seu documento. Confira se os dados estão corretos:</p>
             
             <div className="space-y-4 mb-10 text-left">
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                   <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nome Completo</p>
                   <p className="font-black dark:text-white uppercase">{extractedInfo.firstName} {extractedInfo.lastName}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                   <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nº do Documento</p>
                   <p className="font-black dark:text-white uppercase">{extractedInfo.documentId}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                   <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Data de Nascimento</p>
                   <p className="font-black dark:text-white uppercase">{extractedInfo.birthDate}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setStep('front')} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-4 rounded-2xl font-black uppercase text-[10px]">Corrigir</button>
                <button 
                  onClick={handleFinalSubmit} 
                  disabled={loading}
                  className="bg-blue-600 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2"
                >
                  {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Confirmar e Enviar'}
                </button>
             </div>
          </div>
        )}
        {step === 'front' && (
          <div className="animate-fade-in">
             <input type="file" accept="image/*" className="hidden" ref={frontInputRef} onChange={(e) => handleFileSelect(e, 'front')} />
             <div 
               onClick={() => frontInputRef.current?.click()}
               className={`aspect-[3/2] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center mb-8 transition-all cursor-pointer overflow-hidden ${frontImage ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200'}`}
             >
                {frontPreview ? (
                  <img src={frontPreview} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <CameraIcon className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-[10px] font-black uppercase text-gray-400">Clique para capturar frente</p>
                  </>
                )}
             </div>
             <button 
                onClick={() => setStep('back')} 
                disabled={!frontImage}
                className="w-full bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-all"
             >
                Próximo Passo
             </button>
          </div>
        )}

        {step === 'back' && (
          <div className="animate-fade-in">
             <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-6 text-center">Verso do Documento</h3>
             <input type="file" accept="image/*" className="hidden" ref={backInputRef} onChange={(e) => handleFileSelect(e, 'back')} />
             <div 
               onClick={() => backInputRef.current?.click()}
               className={`aspect-[3/2] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center mb-8 transition-all cursor-pointer overflow-hidden ${backImage ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200'}`}
             >
                {backPreview ? (
                  <img src={backPreview} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <CameraIcon className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-[10px] font-black uppercase text-gray-400">Clique para capturar verso</p>
                  </>
                )}
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setStep('front')} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-4 rounded-2xl font-black uppercase text-[10px]">Voltar</button>
                <button 
                    onClick={() => setStep('selfie')} 
                    disabled={!backImage}
                    className="bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl"
                >
                    Próximo
                </button>
             </div>
          </div>
        )}

        {step === 'selfie' && (
          <div className="animate-fade-in">
             <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-6 text-center">Sua Identidade</h3>
             <input type="file" accept="image/*" className="hidden" ref={selfieInputRef} onChange={(e) => handleFileSelect(e, 'selfie')} />
             <div 
                onClick={() => selfieInputRef.current?.click()}
                className={`aspect-square w-48 mx-auto rounded-full border-2 border-dashed flex flex-col items-center justify-center mb-8 transition-all cursor-pointer overflow-hidden ${selfieImage ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200'}`}
             >
                {selfiePreview ? (
                  <img src={selfiePreview} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <UserIcon className="h-12 w-12 text-gray-300" />
                    <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Sua Selfie</p>
                  </>
                )}
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setStep('back')} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-4 rounded-2xl font-black uppercase text-[10px]">Voltar</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !selfieImage}
                  className="bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-3"
                >
                  {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Finalizar'}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IDVerification;
