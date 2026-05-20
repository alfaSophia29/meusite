
import { User, Post, PostType, ChatConversation, AdCampaign, Store, Product, AffiliateSale, Comment, ShippingAddress, ProductType, AudioTrack, Notification, NotificationType, CartItem, ProductRating, OrderStatus, CyberEvent, Story, Transaction, ContentReport, SystemLog, GlobalSettings, TransactionType, ChatType, GroupTheme, Message, SupportTicket, SupportMessage, AffiliateLink, CallType } from '../types';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { safeJsonStringify } from '../lib/utils';
import { checkContentSecurity } from './sentinelService';
import { auth, db, storage, isFirebaseConfigured } from './firebaseClient';
export { auth, db, storage, isFirebaseConfigured };
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, addDoc, onSnapshot,
  getDocFromServer, getDocsFromServer, QuerySnapshot, DocumentData, arrayUnion, increment,
  startAfter, QueryDocumentSnapshot, Query, documentId, arrayRemove // Adicionados para paginação e limpeza
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- HELPERS ---
/**
 * Normaliza um identificador (e-mail ou telefone)
 */
export const normalizeIdentifier = (identifier: string): string => {
  if (!identifier) return '';
  const trimmed = identifier.trim();
  
  // Se for e-mail, apenas lower case
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  
  // Se for telefone, remove tudo exceto dígitos (para compatibilidade com contas registradas via celular)
  return trimmed.replace(/\D/g, '');
};

/**
 * Deriva um e-mail de um identificador
 */
export const deriveEmail = (identifier: string): string => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return '';
  if (normalized.includes('@')) return normalized;
  
  // If it's a phone number, we use normalized + @facephone.com
  // We keep it as-is (except for trim/lowercase) to match legacy records.
  return `${normalized}@facephone.com`;
};

// --- CLOUDINARY CONFIG ---
// Prioritize environment variables, then fallback to hardcoded values
export const CLOUDINARY_CLOUD_NAME = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'dblnktl9m';
export const CLOUDINARY_UPLOAD_PRESET = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'CONEXWORLD';

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET && CLOUDINARY_CLOUD_NAME !== 'dblnktl9m') {
  console.log("✅ Cloudinary configurado via variáveis de ambiente.");
} else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET) {
  console.log("✅ Cloudinary configurado com sucesso (Hardcoded).");
} else {
  console.warn("⚠️ Cloudinary não detectado. Verifique as variáveis de ambiente VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET.");
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Tratamento global de erros do Firestore
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Create a safe authInfo object
  const authInfo = {
    userId: auth?.currentUser?.uid || 'anonymous',
    email: auth?.currentUser?.email || null,
    emailVerified: auth?.currentUser?.emailVerified || false,
    isAnonymous: auth?.currentUser?.isAnonymous || false,
    tenantId: auth?.currentUser?.tenantId || null,
    providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
      providerId: String(provider.providerId || ''),
      displayName: String(provider.displayName || ''),
      email: String(provider.email || ''),
      photoUrl: String(provider.photoURL || '')
    })) || []
  };

  const errInfo = {
    error: errMessage,
    authInfo,
    operationType,
    path: String(path)
  };

  try {
    const serialized = safeJsonStringify(errInfo);
    // Don't log for common anonymous permission issues on notifications/sales/ads which are often transient during login/logout
    const isQuietPath = ['notifications', 'sales', 'ads', 'profiles'].includes(path || '');
    const isAnonymous = authInfo.userId === 'anonymous';
    
    if (isQuietPath && isAnonymous && errMessage.toLowerCase().includes('permissions')) {
       // Silently ignore quiet errors for anonymous users
       return;
    }

    console.error('Firestore Error: ', serialized);
    
    // Don't throw for LIST/GET on quiet paths to avoid crashing App
    if (isQuietPath && (operationType === OperationType.LIST || operationType === OperationType.GET)) {
      return; 
    }
    throw new Error(serialized);
  } catch (stringifyError) {
    // If stringify fails or we returned above
    const isQuietPath = ['notifications', 'sales', 'ads', 'profiles'].includes(path || '');
    if (isQuietPath && (operationType === OperationType.LIST || operationType === OperationType.GET)) {
      return;
    }
    if (stringifyError instanceof Error && isQuietPath && stringifyError.message.includes(path || '')) return;

    const fallbackMessage = `Firestore Error [${operationType}] at [${path}]: ${errMessage}`;
    console.error(fallbackMessage);
    throw new Error(fallbackMessage);
  }
}

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

const CURRENT_USER_KEY = 'cyberphone_current_user_id';

/**
 * MAPEADOR DE DADOS
 * Garante que os dados do usuário sejam respeitados
 */
export const mapUserData = (id: string, dbData: any, authUser?: any): User => {
    const authDisplayName = authUser?.displayName || "";
    const authPhotoURL = authUser?.photoURL || "";

    // Mapeia nomes e fotos reais
    let firstName = dbData?.firstName || authDisplayName.split(' ')[0] || "";
    let lastName = dbData?.lastName || authDisplayName.split(' ').slice(1).join(' ') || "";

    if (!firstName && authUser?.email) {
        firstName = authUser.email.split('@')[0];
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        lastName = "Membro";
    }

    const email = (dbData?.email || authUser?.email || '').toLowerCase().trim();
    const isAdminEmail = email === 'ac926815124@gmail.com' || email === 'alfaajmc@gmail.com' || email === 'admin@facephone.com';

    const lastSeen = Number(dbData?.lastSeen || 0);
    const isOnline = !!dbData?.isOnline;
    // Consideramos online apenas se o flag for true E houver atividade nos últimos 5 minutos
    const isActuallyOnline = isOnline && (Date.now() - lastSeen < 5 * 60 * 1000);

    return {
        id: id,
        firstName: firstName || 'Usuário',
        lastName: lastName || 'Membro',
        email: email,
        phone: dbData?.phone || authUser?.phoneNumber || '',
        documentId: dbData?.documentId || '',
        birthDate: Number(dbData?.birthDate || Date.now()),
        gender: dbData?.gender || null,
        profilePicture: dbData?.profilePicture || authPhotoURL || DEFAULT_PROFILE_PIC,
        coverPhoto: dbData?.coverPhoto || '',
        followedUsers: dbData?.followedUsers || [],
        followers: dbData?.followers || [],
        balance: Number(dbData?.balance || 0),
        bio: dbData?.bio || '',
        storeId: dbData?.storeId || null,
        isAdmin: isAdminEmail || !!dbData?.isAdmin,
        isVerified: isAdminEmail || !!dbData?.isVerified,
        idVerificationStatus: dbData?.idVerificationStatus || 'NOT_STARTED',
        idVerificationDocs: dbData?.idVerificationDocs || null,
        userType: isAdminEmail ? 'CREATOR' : (dbData?.userType || 'STANDARD'),
        isOnline: isActuallyOnline,
        lastSeen: lastSeen,
        isMonetized: !!dbData?.isMonetized,
        monetizationStatus: dbData?.monetizationStatus || 'INELIGIBLE',
        monetizationGoals: dbData?.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: dbData?.followers?.length || 0,
            currentWatchHours: dbData?.monetizationGoals?.currentWatchHours || 0,
            currentShortsViews: dbData?.monetizationGoals?.currentShortsViews || 0,
            termsAccepted: !!dbData?.monetizationGoals?.termsAccepted,
            verificationStep: dbData?.idVerificationStatus === 'APPROVED'
        },
        address: dbData?.address || undefined,
        blockedUserIds: dbData?.blockedUserIds || [],
        country: dbData?.country || ''
    } as User;
};

export const findUserById = async (userId: string, authUserReference?: any): Promise<User | undefined> => {
  if (!userId || !isFirebaseConfigured || !db) return undefined;
  
  const currentAuth = authUserReference || auth?.currentUser;
  const isOwner = currentAuth?.uid === userId;

  // Processar cobranças automáticas de anúncios se for o dono
  if (isOwner) {
    checkAndProcessAdBilling(userId).catch(console.error);
  }
  
  try {
    let docSnap;
    let data;
    let foundInPrivate = false;

    // Tenta sempre ler do public_profiles primeiro se não for o dono
    // Ou tenta ler do profiles se for o dono (para pegar saldo, etc)
    if (isOwner) {
      try {
        docSnap = await getDoc(doc(db, 'profiles', userId));
        if (docSnap.exists()) {
          data = docSnap.data();
          foundInPrivate = true;
        }
      } catch (err: any) {
        // Se falhar a leitura privada (ex: permissão negada por delay de auth), tenta a pública
        console.warn("[STORAGE] Falha na leitura privada, tentando pública:", err.message);
      }
    }

    if (!foundInPrivate) {
      docSnap = await getDoc(doc(db, 'public_profiles', userId));
      if (docSnap.exists()) {
        data = docSnap.data();
      }
    }
    
    if (data) {
      return mapUserData(userId, data, currentAuth);
    } else if (currentAuth && isOwner) {
      // Se for o dono e não existir em lugar nenhum, cria o perfil básico
      const newUser = mapUserData(userId, null, currentAuth);
      
      try {
        await setDoc(doc(db, 'profiles', userId), {
            ...newUser,
            timestamp: Date.now()
        });

        const { email, phone, documentId, birthDate, balance, ...publicData } = newUser;
        await setDoc(doc(db, 'public_profiles', userId), {
            ...publicData,
            timestamp: Date.now()
        });
      } catch (err) {
        console.error("[STORAGE] Erro ao criar perfil inicial:", err);
      }
      
      return newUser;
    }
  } catch (e: any) { 
    if (e.message && e.message.includes('offline')) {
      console.warn("⚠️ Firestore Offline em findUserById:", e.message);
    } else {
      // Don't throw for simple not found or expected permission errors on public lookups
      console.error("[STORAGE] Erro em findUserById:", e.message);
    }
  }
  return undefined;
};

// --- AUTENTICAÇÃO ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const emailDerived = deriveEmail(email);
  console.log("[STORAGE] Tentando login para:", emailDerived, "Auth inicializado:", !!auth);
  
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailDerived, password);
    const user = await findUserById(userCredential.user.uid, userCredential.user);
    
    // Check for admin status to sync to the admins collection for faster rule checks
    if (user && user.isAdmin && db) {
      try {
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
          email: emailDerived,
          timestamp: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn("[STORAGE] Erro ao sincronizar admins:", err);
      }
    }

    const isAdminEmail = emailDerived === 'ac926815124@gmail.com' || emailDerived === 'alfaajmc@gmail.com' || emailDerived === 'admin@facephone.com';
    if (isAdminEmail && user && db) {
      if (!user.isAdmin || !user.isVerified || user.userType !== 'CREATOR') {
        const updatedData = {
          isAdmin: true,
          isVerified: true,
          userType: 'CREATOR'
        };
        await updateDoc(doc(db, 'profiles', user.id), updatedData);
        await updateDoc(doc(db, 'public_profiles', user.id), updatedData);
        user.isAdmin = true;
        user.isVerified = true;
        user.userType = 'CREATOR';
      }
    }

    if (user) return user;
    
    // Se logou mas não achou perfil, tenta criar um básico (fallback)
    console.warn("[STORAGE] Usuário logado mas perfil não encontrado para [", emailDerived, "]. Criando fallback.");
    const fallbackUser = mapUserData(userCredential.user.uid, null, userCredential.user);
    fallbackUser.blockedUserIds = [];
    
    // Auto-admin for fallback too
    if (isAdminEmail && db) {
      fallbackUser.isAdmin = true;
      fallbackUser.isVerified = true;
      fallbackUser.userType = 'CREATOR';
      
      // Save it
      await setDoc(doc(db, 'profiles', fallbackUser.id), { ...fallbackUser, timestamp: Date.now() });
      const { email: e, phone, documentId, birthDate, balance, ...publicData } = fallbackUser;
      await setDoc(doc(db, 'public_profiles', fallbackUser.id), { ...publicData, timestamp: Date.now() });
    }

    return fallbackUser;
  } catch (e: any) {
    // For invalid-credential, we explicitly log that it was a credential mismatch
    if (e.code === 'auth/invalid-credential') {
      console.warn(`[STORAGE] Falha de login (Credenciais Inválidas) para: ${emailDerived}`);
    } else if (e.code === 'auth/too-many-requests') {
      console.warn(`[STORAGE] Falha de login (Muitas Tentativas) para: ${emailDerived}`);
    } else {
      console.error("Erro no login:", safeJsonStringify(e));
    }
    throw e;
  }
};

export const loginWithGoogle = async (): Promise<User> => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado.");
  }
  
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = await findUserById(userCredential.user.uid, userCredential.user);
    
    if (user) return user;
    
    // Se logou mas não achou perfil, cria um básico
    console.log("[STORAGE] Usuário Google novo. Criando perfil.");
    const email = (userCredential.user.email || '').toLowerCase().trim();
    const displayName = userCredential.user.displayName || "";
    const names = displayName.split(' ');
    
    const userData = {
      firstName: names[0] || "Usuário",
      lastName: names.slice(1).join(' ') || "Google",
      email: email,
      phone: '',
      userType: 'STANDARD'
    };
    
    return await createFirestoreUser(userCredential.user.uid, userData, userCredential.user);
  } catch (e: any) {
    console.error("Erro no login com Google:", safeJsonStringify(e));
    throw e;
  }
};

export const createFirestoreUser = async (uid: string, userData: any, authUser: any): Promise<User> => {
    let profilePicUrl = userData.profilePicture || DEFAULT_PROFILE_PIC;
    if (userData.profileImageFile) {
      try {
        profilePicUrl = await uploadFile(userData.profileImageFile, 'profiles');
      } catch (err) {
        console.warn("Erro ao fazer upload da foto de perfil:", err);
      }
    }

    let coverPhotoUrl = userData.coverPhoto || '';
    if (userData.coverImageFile) {
      try {
        coverPhotoUrl = await uploadFile(userData.coverImageFile, 'covers');
      } catch (err) {
        console.warn("Erro ao fazer upload da foto de capa:", err);
      }
    }

    try {
      await updateProfile(authUser, {
        displayName: `${userData.firstName} ${userData.lastName}`,
        photoURL: profilePicUrl
      });
    } catch (err) {
      console.warn("Erro ao atualizar displayName no Auth:", err);
    }

    const emailClean = (userData.email || '').toLowerCase().trim();
    const isAdminEmail = emailClean === 'ac926815124@gmail.com' || emailClean === 'alfaajmc@gmail.com' || emailClean === 'admin@facephone.com';
    const newUser = mapUserData(uid, { 
      ...userData, 
      profilePicture: profilePicUrl,
      coverPhoto: coverPhotoUrl,
      birthDate: userData.birthDate || Date.now(),
      gender: userData.gender,
      isAdmin: isAdminEmail ? true : !!userData.isAdmin,
      isVerified: isAdminEmail ? true : !!userData.isVerified,
      userType: isAdminEmail ? 'CREATOR' : (userData.userType || 'STANDARD'),
      blockedUserIds: []
    }, authUser);
    
    // Private profile (contains PII)
    try {
      if (db) {
        await setDoc(doc(db, 'profiles', uid), {
            ...newUser,
            balance: 100, // Dá saldo inicial de $100 para testes
            followedUsers: [],
            followers: [],
            timestamp: Date.now()
        });

        // Registrar unicidade do e-mail
        await setDoc(doc(db, 'uniqueness_registry', `email_${emailClean}`), {
          userId: uid,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error("Erro ao criar perfil privado ou registrar e-mail:", err);
    }

    // Public profile (no PII)
    try {
      if (db) {
        const { email, phone, documentId, birthDate, balance, ...publicData } = newUser;
        await setDoc(doc(db, 'public_profiles', uid), {
            ...publicData,
            balance: 100, // Sincroniza saldo inicial
            followedUsers: [],
            followers: [],
            timestamp: Date.now()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'public_profiles/' + uid);
    }
    
    return newUser;
};

export const checkFieldUniqueness = async (field: string, value: string): Promise<boolean> => {
  if (!db || !value) return true;
  try {
    // Usamos o registry para evitar problemas de permissão e PII
    const registryId = `${field}_${value.toLowerCase().trim()}`;
    const docSnap = await getDoc(doc(db, 'uniqueness_registry', registryId));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentUserId = auth?.currentUser?.uid;
      // Se o ID registrado for o meu, então é único para mim (estou apenas re-verificando)
      if (currentUserId && data.userId === currentUserId) {
        return true;
      }
      return false;
    }

    // Fallback para perfis públicos se for campo público (username etc)
    // Mas para documentId, email, phone, o registry é a fonte da verdade.
    if (['documentId', 'email', 'phone'].includes(field)) {
      return true;
    }

    const q = query(collection(db, 'public_profiles'), where(field, '==', value));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (err) {
    console.error(`Erro ao verificar unicidade do campo ${field}:`, err);
    return true; 
  }
};

export const registerUniqueness = async (field: string, value: string, userId: string) => {
  if (!db || !value) return;
  const registryId = `${field}_${value.toLowerCase().trim()}`;
  try {
    await setDoc(doc(db, 'uniqueness_registry', registryId), {
      userId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Erro ao registrar unicidade: ${registryId}`, error);
  }
};

export const registerUser = async (userData: any): Promise<User> => {
  const emailDerived = deriveEmail(userData.email);
  const phoneClean = normalizeIdentifier(userData.phone || '');
  
  console.log("[STORAGE] Tentando registro para:", emailDerived, "Auth inicializado:", !!auth);
  
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }
  
  // Validação de unicidade do documento
  if (userData.documentId) {
    const docIdClean = (userData.documentId || '').trim();
    const isDocUnique = await checkFieldUniqueness('documentId', docIdClean);
    if (!isDocUnique) {
      throw new Error("Este número de documento já está vinculado a outra conta.");
    }
  }

  // Validação de unicidade do telefone (se houver)
  if (phoneClean) {
    const isPhoneUnique = await checkFieldUniqueness('phone', phoneClean);
    if (!isPhoneUnique) {
      throw new Error("Este número de celular já está vinculado a outra conta.");
    }
  }

  // Validação de unicidade do e-mail no Firestore (além do Firebase Auth)
  const isEmailUnique = await checkFieldUniqueness('email', emailDerived);
  if (!isEmailUnique) {
    throw new Error("Este e-mail já está em uso por outra conta.");
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, emailDerived, userData.password);
    return await createFirestoreUser(userCredential.user.uid, {
      ...userData,
      email: emailDerived,
      phone: phoneClean
    }, userCredential.user);
  } catch (e: any) {
    console.error("Erro no registro:", safeJsonStringify(e));
    throw e;
  }
};

export const recoverPassword = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Auth não está inicializado. Isso pode ser um problema de conexão temporário. Por favor, recarregue a página.");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (e: any) {
    console.error("Erro na recuperação de senha:", safeJsonStringify(e));
    throw e;
  }
};

// --- CONTEÚDO (FIRESTORE) ---

export const getPosts = async (currentUserId?: string, limitCount?: number, startDoc?: QueryDocumentSnapshot, targetUserId?: string): Promise<PaginatedResult<Post>> => {
  if (!isFirebaseConfigured || !db) return { items: [], lastDoc: null, hasMore: false };
  try {
    let q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    
    if (targetUserId) {
      q = query(q, where('userId', '==', targetUserId));
    }

    if (startDoc) {
      q = query(q, startAfter(startDoc));
    }
    
    if (limitCount) {
      q = query(q, limit(limitCount + 1));
    }

    let snap;
    try {
      snap = await getDocs(q);
    } catch (initialError: any) {
      if (initialError.message && initialError.message.includes('offline')) {
        console.warn("⚠️ Firestore Offline em getPosts. Tentando getDocsFromServer...");
        snap = await getDocsFromServer(q);
      } else {
        throw initialError;
      }
    }
    
    let docs = snap.docs;
    const hasMore = limitCount ? docs.length > limitCount : false;
    if (hasMore) {
        docs = docs.slice(0, limitCount);
    }
    
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    let posts = docs.map(d => ({ ...d.data(), id: d.id } as Post));
    
    // Mutual Blocking Filter
    if (currentUserId && currentUserId !== 'guest') {
        const hiddenIds = await getMutualBlockedUserIds(currentUserId);
        if (hiddenIds.length) {
            posts = posts.filter(p => !hiddenIds.includes(p.userId));
        }
    }

    // Ordenação personalizada: Impulsionados (por valor do lance) primeiro, depois por data
    // NOTA: Se usarmos paginação pesada, o sort por lance talvez deva ser feito no servidor (index composto)
    // Mas para o volume atual, mantemos no cliente para suporte a lance dinâmico
    const sortedPosts = posts.sort((a, b) => {
      const now = Date.now();
      const bidA = (a.isBoosted && a.boostExpires && a.boostExpires > now) ? (a.boostBid || 0) : 0;
      const bidB = (b.isBoosted && b.boostExpires && b.boostExpires > now) ? (b.boostBid || 0) : 0;
      
      if (bidB !== bidA) return bidB - bidA;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    return {
      items: sortedPosts,
      lastDoc: lastDoc as QueryDocumentSnapshot | null,
      hasMore
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
    return { items: [], lastDoc: null, hasMore: false };
  }
};

export const getPostById = async (id: string): Promise<Post | undefined> => {
  if (!isFirebaseConfigured || !db) return undefined;
  const docSnap = await getDoc(doc(db, 'posts', id));
  return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Post : undefined;
};

export const addPost = async (post: Post) => {
  if (!isFirebaseConfigured || !db) return;

  // Sentinela AI Check
  const security = await checkContentSecurity(post.content || '', 'post');
  if (!security.allowed) {
      throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
  }

  try {
    await setDoc(doc(db, 'posts', post.id), post);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'posts/' + post.id);
  }
};

export const updatePost = async (post: Post) => {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, 'posts', post.id), post as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'posts/' + post.id);
  }
};

export const deletePost = async (postId: string) => {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'posts/' + postId);
  }
};

// --- UPLOAD (FIREBASE STORAGE / FALLBACK) ---

const compressImage = (file: File | Blob, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const toBase64 = (file: File | Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

export const uploadFile = async (file: File | Blob, folder: string, retryCount = 0): Promise<string> => {
  let processedFile = file;
  if (file && file.type && file.type.startsWith('image/')) {
    try {
      processedFile = await compressImage(file);
    } catch (e) {
      console.warn("⚠️ Image compression failed, using original file", e);
    }
  }

  // 1. Tentar Firebase Storage se estiver configurado
  if (isFirebaseConfigured && storage) {
    try {
      console.log(`[Firebase Storage] Iniciando upload para: ${folder}/${(processedFile as File).name || 'blob'}`);
      const fileName = processedFile instanceof File ? `${Date.now()}_${processedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}` : `${Date.now()}_blob`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      
      const metadata = {
          contentType: processedFile.type || 'application/octet-stream'
      };

      const snapshot = await uploadBytes(storageRef, processedFile, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log("✅ [Firebase Storage] Upload concluído com sucesso!");
      return downloadURL;
    } catch (fbError: any) {
      console.warn(`⚠️ [Firebase Storage] Falha no upload (Tentativa ${retryCount + 1}):`, fbError.message);
      
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return uploadFile(processedFile, folder, retryCount + 1);
      }
      
      console.warn("🔄 [Firebase Storage] Esgotadas as tentativas. Migrando para fallback Base64.");
    }
  }

  // 2. Fallback para Cloudinary (se as chaves estiverem presentes e não forem padrão)
  const cloudName = CLOUDINARY_CLOUD_NAME.trim();
  const uploadPreset = CLOUDINARY_UPLOAD_PRESET.trim();

  if (cloudName && uploadPreset && cloudName !== 'dblnktl9m') {
    try {
      console.log(`[Cloudinary] Iniciando upload reserva para cloud: ${cloudName}`);
      
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('cloud_name', cloudName);
      formData.append('folder', `cyberphone/${folder}`);
      
      const isVideo = folder === 'reels' || (processedFile instanceof File && processedFile.type.startsWith('video/'));
      const resourceType = isVideo ? 'video' : 'auto';

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [Cloudinary] Upload concluído com sucesso (Fallback)!");
        return data.secure_url;
      }
    } catch (cloudinaryError) {
      console.warn("⚠️ [Cloudinary] Falha no upload fallback.");
    }
  }

  // 3. Fallback Final: Base64 (Último recurso para garantir que a UI funcione)
  console.log("ℹ️ [Storage] Usando fallback Base64 para mídia.");
  try {
     return await toBase64(processedFile);
  } catch (base64Error) {
     console.error("❌ [Storage] Falha crítica em todos os métodos de upload.");
     return URL.createObjectURL(processedFile);
  }
};

// --- FUNÇÕES SOCIAIS ---

export const toggleBlockUser = async (cur: string, target: string) => {
  if (!db) return;
  const u1 = await findUserById(cur);
  if (u1) {
    const isBlocked = u1.blockedUserIds?.includes(target);
    const newBlocked = isBlocked 
        ? u1.blockedUserIds?.filter((i: string) => i !== target) 
        : [...(u1.blockedUserIds || []), target];
    
    await updateDoc(doc(db, 'profiles', cur), { blockedUserIds: newBlocked });

    // Sincronização de Bloqueio Mútuo
    const blockId = `${cur}_${target}`;
    try {
      if (isBlocked) {
        await deleteDoc(doc(db, 'blocks', blockId));
      } else {
        await setDoc(doc(db, 'blocks', blockId), {
            blockerId: cur,
            blockedId: target,
            timestamp: Date.now()
        });
      }
    } catch (err) {
      console.warn("[STORAGE] Erro ao sincronizar coleção 'blocks':", err);
    }
  }
};

export const getMutualBlockedUserIds = async (userId: string): Promise<string[]> => {
    if (!db || !userId || userId === 'anonymous' || userId === 'guest') return [];
    
    // Verificamos se há um usuário autenticado no Firebase para evitar erros de permissão
    if (!auth?.currentUser || auth.currentUser.uid !== userId) {
        return [];
    }

    try {
        // 1. Usuários que EU bloqueei (do perfil)
        const user = await findUserById(userId);
        const blockedByMe = user?.blockedUserIds || [];
        
        // 2. Usuários que ME bloquearam (da coleção 'blocks')
        // Adicionada verificação de segurança para garantir que apenas o usuário autenticado pode listar seus bloqueios
        // O Firestore validará isso via regras, mas evitamos a chamada se não houver UID válido
        const blocksSnap = await getDocs(query(collection(db, 'blocks'), where('blockedId', '==', userId)));
        const blockedByOthers = blocksSnap.docs.map(d => d.data().blockerId);
        
        return Array.from(new Set([...blockedByMe, ...blockedByOthers]));
    } catch (error) {
        // Usando o manipulador de erro padrão para melhor diagnóstico
        // Se o erro for de permissão insuficiente, logamos apenas um aviso se for esperado (ex: logout pendente)
        const errStr = String(error);
        if (errStr.includes('permission-denied') || errStr.includes('insufficient permissions')) {
            console.warn("[STORAGE] Permissão negada ao listar blocos para:", userId);
            return [];
        }
        
        handleFirestoreError(error, OperationType.LIST, 'blocks');
        return [];
    }
};

export const createNotification = async (recipientId: string, actorId: string, type: NotificationType, postId?: string, groupName?: string, callType?: CallType) => {
  if (!isFirebaseConfigured || !db || recipientId === actorId) return;
  try {
    // Check if actor is blocked by recipient
    const recipientProfile = await findUserById(recipientId);
    if (recipientProfile?.blockedUserIds?.includes(actorId)) {
        return;
    }

    await addDoc(collection(db, 'notifications'), {
      recipientId,
      actorId,
      type,
      postId: postId || null,
      groupName: groupName || null,
      callType: callType || null,
      timestamp: Date.now(),
      isRead: false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
  }
};

export const toggleFollowUser = async (cur: string, target: string) => {
  if (!db) return;
  const u1 = await findUserById(cur);
  const u2 = await findUserById(target);
  if (u1 && u2) {
    const isFollowing = u1.followedUsers.includes(target);
    const newFollowed = isFollowing ? u1.followedUsers.filter(i => i !== target) : [...u1.followedUsers, target];
    const newFollowers = isFollowing ? u2.followers.filter(i => i !== cur) : [...u2.followers, cur];
    
    // Update both private and public profiles
    await updateDoc(doc(db, 'profiles', cur), { followedUsers: newFollowed });
    await updateDoc(doc(db, 'public_profiles', cur), { followedUsers: newFollowed });
    
    await updateDoc(doc(db, 'profiles', target), { followers: newFollowers });
    await updateDoc(doc(db, 'public_profiles', target), { followers: newFollowers });

    // Verificar se o usuário agora é elegível para monetização
    const goals = u2.monetizationGoals || { 
        followersGoal: 1000, 
        watchHoursGoal: 4000, 
        shortsViewsGoal: 10000000,
        currentFollowers: 0,
        currentWatchHours: 0,
        currentShortsViews: 0
    };
    
    const currentFollowers = newFollowers.length;
    const meetsFollowers = currentFollowers >= goals.followersGoal;
    const meetsViews = (goals.currentWatchHours || 0) >= goals.watchHoursGoal || (goals.currentShortsViews || 0) >= goals.shortsViewsGoal;
    const meetsIdentity = u2.idVerificationStatus === 'APPROVED';

    let newStatus = u2.monetizationStatus || 'INELIGIBLE';
    if (newStatus === 'INELIGIBLE' && meetsFollowers && meetsViews && meetsIdentity) {
        newStatus = 'ELIGIBLE';
        await updateDoc(doc(db, 'profiles', target), { monetizationStatus: newStatus });
        await updateDoc(doc(db, 'public_profiles', target), { monetizationStatus: newStatus });
    }

    if (!isFollowing) {
      await createNotification(target, cur, NotificationType.NEW_FOLLOWER);
    }
  }
};

export const updatePostLikes = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const postData = d.data();
        const likes = postData.likes || [];
        const isLiking = !likes.includes(uid);
        const newLikes = isLiking ? [...likes, uid] : likes.filter((i:any)=>i!==uid);
        await updateDoc(ref, { likes: newLikes });

        if (isLiking && postData.userId !== uid) {
          await createNotification(postData.userId, uid, NotificationType.LIKE, pid);
        }
    }
};

export const incrementPostViews = async (pid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if (d.exists()) {
        const postData = d.data();
        const currentViews = postData.views || 0;
        await updateDoc(ref, { views: currentViews + 1 });
        
        // Atualizar metas de monetização do autor
        const authorId = postData.userId;
        const authorRef = doc(db, 'public_profiles', authorId);
        const authorDoc = await getDoc(authorRef);
        if (authorDoc.exists()) {
            const authorData = authorDoc.data();
            const goals = authorData.monetizationGoals || { 
                followersGoal: 1000, 
                watchHoursGoal: 4000, 
                shortsViewsGoal: 10000000,
                currentFollowers: authorData.followers?.length || 0,
                currentWatchHours: 0,
                currentShortsViews: 0
            };
            
            let newWatchHours = goals.currentWatchHours || 0;
            let newShortsViews = goals.currentShortsViews || 0;

            if (postData.type === PostType.REEL) {
                newShortsViews += 1;
            } else if (postData.type === PostType.VIDEO) {
                newWatchHours += 0.05; // Simula 3 minutos de retenção média
            }

            const currentFollowers = authorData.followers?.length || 0;
            const meetsFollowers = currentFollowers >= goals.followersGoal;
            const meetsViews = newWatchHours >= goals.watchHoursGoal || newShortsViews >= goals.shortsViewsGoal;
            const meetsIdentity = authorData.idVerificationStatus === 'APPROVED';

            let newStatus = authorData.monetizationStatus || 'INELIGIBLE';
            if (newStatus === 'INELIGIBLE' && meetsFollowers && meetsViews && meetsIdentity) {
                newStatus = 'ELIGIBLE';
            }
            
            const updateData: any = {
                monetizationStatus: newStatus
            };

            if (!authorData.monetizationGoals) {
                updateData.monetizationGoals = {
                    ...goals,
                    currentWatchHours: newWatchHours,
                    currentShortsViews: newShortsViews,
                    currentFollowers: currentFollowers
                };
            } else {
                updateData['monetizationGoals.currentWatchHours'] = newWatchHours;
                updateData['monetizationGoals.currentShortsViews'] = newShortsViews;
                updateData['monetizationGoals.currentFollowers'] = currentFollowers;
            }
            
            await updateDoc(authorRef, updateData);
            // Também tenta atualizar o profile privado se for do próprio usuário (raro aqui) ou se tiver permissão
            updateDoc(doc(db, 'profiles', authorId), updateData).catch(() => {});
        }
    }
};

export const toggleReaction = async (targetId: string, targetType: 'COMMENT' | 'MESSAGE', emoji: string, userId: string, parentId?: string) => {
    if (!db) return;
    
    if (targetType === 'COMMENT') {
        const postRef = doc(db, 'posts', parentId!);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const postData = postDoc.data();
            const comments = [...(postData.comments || [])];
            
            // Função recursiva para encontrar o comentário em qualquer nível de nesting
            const findAndToggleInComments = (commentList: any[]): boolean => {
                for (let i = 0; i < commentList.length; i++) {
                    if (commentList[i].id === targetId) {
                        const reactions = commentList[i].reactions || {};
                        const userHasThisEmoji = (reactions[emoji] || []).includes(userId);
                        
                        if (userHasThisEmoji) {
                            // Se já tem este emoji, apenas remove
                            reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
                        } else {
                            // Se é um novo emoji, remove de TODOS os outros primeiro (estilo Facebook)
                            Object.keys(reactions).forEach(e => {
                                if (reactions[e]) {
                                    reactions[e] = reactions[e].filter((id: string) => id !== userId);
                                }
                            });
                            // E adiciona ao novo
                            reactions[emoji] = [...(reactions[emoji] || []), userId];
                        }
                        
                        commentList[i] = { ...commentList[i], reactions };
                        return true;
                    }
                    if (commentList[i].replies && findAndToggleInComments(commentList[i].replies)) {
                        return true;
                    }
                }
                return false;
            };

            if (findAndToggleInComments(comments)) {
                await updateDoc(postRef, { comments });
            }
        }
    } else if (targetType === 'MESSAGE') {
        const chatRef = doc(db, 'chats', parentId!);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            const messages = [...(chatData.messages || [])];
            const messageIndex = messages.findIndex(m => m.id === targetId);
            
                if (messageIndex !== -1) {
                    const message = messages[messageIndex];
                    
                    // Restrição: Dono da mensagem não pode reagir à própria mensagem
                    if (message.senderId === userId) {
                        throw new Error('OWNER_REACTION_NOT_ALLOWED');
                    }

                    const reactions = message.reactions || {};
                    const userHasThisEmoji = (reactions[emoji] || []).includes(userId);
                    
                    if (userHasThisEmoji) {
                        // Remove se já existe
                        reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
                    } else {
                        // Remove de outros e adiciona ao novo
                        Object.keys(reactions).forEach(e => {
                            if (reactions[e]) {
                                reactions[e] = reactions[e].filter((id: string) => id !== userId);
                            }
                        });
                        reactions[emoji] = [...(reactions[emoji] || []), userId];
                    }
                    
                    messages[messageIndex] = { ...message, reactions };
                    await updateDoc(chatRef, { messages });
                }
        }
    }
};

export const addCommentReply = async (postId: string, commentId: string, reply: any) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(reply.text || '', 'comment');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    if (postDoc.exists()) {
        const postData = postDoc.data();
        const comments = [...(postData.comments || [])];
        
        const findAndAddReply = (commentList: any[]): boolean => {
            for (let i = 0; i < commentList.length; i++) {
                if (commentList[i].id === commentId) {
                    commentList[i].replies = [...(commentList[i].replies || []), reply];
                    return true;
                }
                if (commentList[i].replies && findAndAddReply(commentList[i].replies)) {
                    return true;
                }
            }
            return false;
        };

        if (findAndAddReply(comments)) {
            await updateDoc(postRef, { comments });
        }
    }
};

export const addPostComment = async (pid: string, c: any) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(c.content || '', 'comment');
    if (!security.allowed) {
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const postData = d.data();
        await updateDoc(ref, { comments: [...(postData.comments || []), c] });

        if (postData.userId !== c.userId) {
          await createNotification(postData.userId, c.userId, NotificationType.COMMENT, pid);
        }
    }
};

// --- EXPORTS DE COMPATIBILIDADE ---
export const generateUUID = () => crypto.randomUUID();
export const saveUserAddress = async (uid: string, address: ShippingAddress) => {
    if (!db) return;
    await updateDoc(doc(db, 'profiles', uid), { address });
    await updateDoc(doc(db, 'public_profiles', uid), { address });
};

export const getCurrentUserId = (): string | null => localStorage.getItem(CURRENT_USER_KEY);
export const saveCurrentUser = (id: string | null) => id ? localStorage.setItem(CURRENT_USER_KEY, id) : localStorage.removeItem(CURRENT_USER_KEY);
export const getAppTheme = (): GroupTheme => (localStorage.getItem('cyber_app_theme') as GroupTheme) || 'blue';
export const saveAppTheme = (t: GroupTheme) => localStorage.setItem('cyber_app_theme', t);
export const updateUserStatus = async (id: string, online: boolean) => {
  if (isFirebaseConfigured && auth?.currentUser && db) {
    const data = { isOnline: online, lastSeen: Date.now() };
    await updateDoc(doc(db, 'profiles', id), data).catch(() => {});
    await updateDoc(doc(db, 'public_profiles', id), data).catch(() => {});
  }
};

export const isUserOnline = (lastSeen: number | undefined, isOnline: boolean | undefined): boolean => {
    if (!lastSeen) return false;
    // Consideramos online apenas se foi visto nos últimos 5 minutos
    return !!isOnline && (Date.now() - lastSeen < 1000 * 60 * 5);
};

export const formatLastSeen = (lastSeen: number | undefined, isOnline: boolean | undefined, t?: (key: string, options?: any) => string): string => {
    const reallyOnline = isUserOnline(lastSeen, isOnline);
    if (reallyOnline) return t ? t('online_now') : "Online agora";
    if (!lastSeen) return t ? t('seen_long_ago') : "Visto há muito tempo";

    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (t) {
        if (minutes < 1) return t('seen_just_now');
        if (minutes < 60) return t('seen_minutes_ago', { count: minutes });
        if (hours < 24) return t('seen_hours_ago', { count: hours });
        if (days < 7) return t('seen_days_ago', { count: days });
        return t('seen_on', { date: new Date(lastSeen).toLocaleDateString() });
    }

    if (minutes < 1) return "Visto agora mesmo";
    if (minutes < 60) return `Visto há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    if (hours < 24) return `Visto há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 7) return `Visto há ${days} ${days === 1 ? 'dia' : 'dias'}`;
    
    return `Visto em ${new Date(lastSeen).toLocaleDateString()}`;
};
export const getGlobalSettings = async (): Promise<GlobalSettings> => {
    if (!isFirebaseConfigured || !db) return { platformTax: 0.1, minWithdrawal: 50, maintenanceMode: false, boostFee: 5 };
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            platformTax: data.platformTax ?? 0.1,
            minWithdrawal: data.minWithdrawal ?? 50,
            maintenanceMode: !!data.maintenanceMode,
            boostFee: data.boostFee ?? 5,
            boostMinBid: data.boostMinBid ?? 5,
            adMinBudget: data.adMinBudget ?? 5,
            adReachCost: data.adReachCost ?? 2,
            verificationFee: data.verificationFee ?? 10,
            groupCreationFee: data.groupCreationFee ?? 5,
            storeCreationFee: data.storeCreationFee ?? 50,
            positioningMinBid: data.positioningMinBid ?? 1,
            boostDailyMin: data.boostDailyMin ?? 0.5
        } as GlobalSettings;
    }
    return { 
        platformTax: 0.1, 
        minWithdrawal: 50, 
        maintenanceMode: false, 
        boostFee: 5,
        boostMinBid: 5,
        boostDailyMin: 0.5,
        adMinBudget: 5,
        adReachCost: 2,
        verificationFee: 10,
        groupCreationFee: 5,
        storeCreationFee: 50,
        positioningMinBid: 1
    };
};
export const getCart = () => JSON.parse(localStorage.getItem('cyberphone_cart') || '[]');
export const getProducts = async (limitCount?: number, startDoc?: QueryDocumentSnapshot, storeId?: string): Promise<PaginatedResult<Product>> => {
    if (!db) return { items: [], lastDoc: null, hasMore: false };
    try {
        let q = query(collection(db, 'products'), orderBy('name', 'asc')); // Ordenação padrão
        
        if (storeId) {
          q = query(q, where('storeId', '==', storeId));
        }

        if (startDoc) {
          q = query(q, startAfter(startDoc));
        }
        
        if (limitCount) {
          q = query(q, limit(limitCount + 1));
        }

        const snap = await getDocs(q);
        let docs = snap.docs;
        const hasMore = limitCount ? docs.length > limitCount : false;
        
        if (hasMore) {
            docs = docs.slice(0, limitCount);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const items = docs.map(d => ({...d.data(), id: d.id} as Product));

        return {
            items,
            lastDoc: lastDoc as QueryDocumentSnapshot | null,
            hasMore
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
        return { items: [], lastDoc: null, hasMore: false };
    }
};
export const getAds = async () => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        return (await getDocs(collection(db, 'ads'))).docs.map(d => ({...d.data(), id: d.id} as AdCampaign));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'ads');
        return [];
    }
};
export const getStories = async (currentUserId?: string): Promise<Story[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const q = query(
            collection(db, 'stories'), 
            where('timestamp', '>=', twentyFourHoursAgo),
            orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        let stories = snap.docs.map(d => ({ ...d.data(), id: d.id } as Story));

        // Mutual Blocking Filter
        if (currentUserId) {
            const hiddenIds = await getMutualBlockedUserIds(currentUserId);
            if (hiddenIds.length) {
                stories = stories.filter(s => !hiddenIds.includes(s.userId));
            }
        }

        return stories;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stories');
        return [];
    }
};

// FIX: Make uid optional to allow discovery of all chats in FeedPage
export const getChats = async (uid?: string) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        let q;
        if (uid) {
            // Se uid for fornecido, buscamos chats onde o usuário é participante
            q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
        } else {
            // Se não, buscamos apenas grupos públicos para descoberta
            q = query(collection(db, 'chats'), where('isPublic', '==', true));
        }
        const snap = await getDocs(q);
        let chats = snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatConversation));

        if (uid) {
            const hiddenIds = await getMutualBlockedUserIds(uid);
            if (hiddenIds.length) {
                chats = chats.filter(c => {
                    if (c.type === ChatType.PRIVATE) {
                        const partnerId = c.participants.find(p => p !== uid);
                        return !hiddenIds.includes(partnerId || '');
                    }
                    return true;
                });
            }
        }

        return chats;
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'chats');
        return [];
    }
};

export const seedDatabase = async () => {
    if (!isFirebaseConfigured || !db) return;
    
    // Check if we already have posts
    const postsRes = await getPosts();
    if (postsRes.items.length > 0) return;

    console.log("[SEED] Populando banco de dados inicial...");

    const samplePosts: Post[] = [
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'CyberPhone Team',
            authorProfilePic: DEFAULT_PROFILE_PIC,
            type: PostType.TEXT,
            timestamp: Date.now() - 10000,
            content: 'Bem-vindo ao CyberPhone! A rede social do futuro.',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['SOCIAL']
        },
        {
            id: generateUUID(),
            userId: 'system',
            authorName: 'CyberPhone News',
            authorProfilePic: DEFAULT_PROFILE_PIC,
            type: PostType.IMAGE,
            timestamp: Date.now() - 5000,
            content: 'Confira as novas funcionalidades da nossa plataforma!',
            imageUrl: 'https://picsum.photos/seed/tech/800/600',
            likes: [],
            comments: [],
            shares: [],
            saves: [],
            tags: ['NEWS']
        }
    ];

    for (const post of samplePosts) {
        await addPost(post);
    }

    // Add a public group
    const sampleGroup: ChatConversation = {
        id: 'global-chat',
        type: ChatType.GROUP,
        participants: ['system'],
        messages: [],
        groupName: 'Comunidade Global',
        isPublic: true,
        description: 'O lugar para todos os usuários conversarem.'
    };
    try {
        await setDoc(doc(db, 'chats', sampleGroup.id), sampleGroup);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'chats/' + sampleGroup.id);
    }

    console.log("[SEED] Banco de dados populado com sucesso.");
};

export const getUsers = async (currentUser?: User) => {
    if (!isFirebaseConfigured || !db) return [];
    
    // Admins have permission to read full profiles, which contain more data like documentId
    // We try to read profiles first if the user is an admin
    const isAdmin = currentUser?.isAdmin || auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com' || auth?.currentUser?.email === 'admin@facephone.com';
    const path = isAdmin ? 'profiles' : 'public_profiles';
    
    try {
        let snap: QuerySnapshot<DocumentData>;
        try {
            console.log(`[STORAGE] Buscando membros em: ${path} (Admin: ${isAdmin})`);
            snap = await getDocs(collection(db, path));
        } catch (initialError: any) {
            if (isAdmin && path === 'profiles') {
                console.warn("⚠️ Permissão insuficiente para 'profiles'. Tentando 'public_profiles' como fallback de emergência. Dados de e-mail/telefone podem não aparecer.");
                snap = await getDocs(collection(db, 'public_profiles'));
            } else {
                console.error(`[STORAGE] Erro ao listar usuários de [${path}]:`, initialError);
                throw initialError;
            }
        }
        
        let users = snap.docs.map(d => {
            const data = d.data();
            // Flag to indicate if data might be incomplete (from public_profiles)
            const isPartial = path === 'public_profiles' && isAdmin;
            return {
                ...mapUserData(d.id, data),
                _isPartial: isPartial
            };
        });

        // Mutual Blocking Filter
        if (currentUser && !isAdmin) {
            const hiddenIds = await getMutualBlockedUserIds(currentUser.id);
            if (hiddenIds.length) {
                users = users.filter(u => !hiddenIds.includes(u.id));
            }
        }

        return users;
    } catch (error) {
        // Fallback to public_profiles if profiles read fails
        if (isAdmin && path === 'profiles') {
            try {
                const publicSnap = await getDocs(collection(db, 'public_profiles'));
                return publicSnap.docs.map(d => mapUserData(d.id, d.data()));
            } catch (innerError) {
                handleFirestoreError(innerError, OperationType.LIST, 'public_profiles');
            }
        } else {
            handleFirestoreError(error, OperationType.LIST, path);
        }
        return [];
    }
};
export const joinGroup = async (gid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', gid);
    const d = await getDoc(ref);
    if(d.exists()) await updateDoc(ref, { participants: [...d.data().participants, uid] });
};
export const findStoreById = async (id: string) => {
    if (!db) return undefined;
    const d = await getDoc(doc(db, 'stores', id));
    return d.exists() ? d.data() as Store : undefined;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'users', uid), data);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
};

export const updatePostSaves = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const saves = d.data().saves || [];
        const newSaves = saves.includes(uid) ? saves.filter((i:any)=>i!==uid) : [...saves, uid];
        await updateDoc(ref, { saves: newSaves });
    }
};
export const getNotificationsForUser = async (uid: string, limitCount?: number, startDoc?: QueryDocumentSnapshot): Promise<PaginatedResult<Notification>> => {
    if (!isFirebaseConfigured || !db || !uid || uid === 'anonymous' || uid === 'guest') return { items: [], lastDoc: null, hasMore: false };
    
  // Guard: Only fetch if authenticated and UID matches
  if (!auth?.currentUser) {
    console.warn("[STORAGE] getNotificationsForUser: No auth user.");
    return { items: [], lastDoc: null, hasMore: false };
  }
  
  if (auth.currentUser.uid !== uid) {
    // Check if admin - admins can read others' notifications in this app's logic
    const adminEmails = ['ac926815124@gmail.com', 'alfaajmc@gmail.com', 'admin@facephone.com'];
    const isSystemAdmin = adminEmails.includes((auth.currentUser.email || '').toLowerCase());
    
    if (!isSystemAdmin) {
       console.warn("[STORAGE] getNotificationsForUser: UID mismatch and not system admin. Auth UID:", auth.currentUser.uid, "Target UID:", uid);
       return { items: [], lastDoc: null, hasMore: false };
    }
  }

    try {
        let q = query(collection(db, 'notifications'), where('recipientId', '==', uid), orderBy('timestamp', 'desc'));
        
        if (startDoc) {
            q = query(q, startAfter(startDoc));
        }
        
        if (limitCount) {
            q = query(q, limit(limitCount + 1));
        }

        const snap = await getDocs(q);
        let docs = snap.docs;
        const hasMore = limitCount ? docs.length > limitCount : false;
        
        if (hasMore) {
            docs = docs.slice(0, limitCount);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        let notifications = docs.map(d => ({ ...d.data(), id: d.id } as Notification));
        
        // Mutual Blocking Filter
        const hiddenIds = await getMutualBlockedUserIds(uid);
        if (hiddenIds.length) {
            notifications = notifications.filter(n => !hiddenIds.includes(n.actorId));
        }
        
        return {
            items: notifications,
            lastDoc: lastDoc as QueryDocumentSnapshot | null,
            hasMore
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
        return { items: [], lastDoc: null, hasMore: false };
    }
};
export const deleteNotification = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    try {
        await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'notifications/' + id);
    }
};

export const clearAllNotifications = async (uid: string) => {
    if (!isFirebaseConfigured || !db || !uid || uid === 'anonymous' || uid === 'guest') return;

    // Guard: Only clear if authenticated and UID matches
    if (!auth?.currentUser || auth.currentUser.uid !== uid) {
        return;
    }

    try {
        const snap = await getDocs(query(collection(db, 'notifications'), where('recipientId', '==', uid)));
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'notifications', d.id));
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'notifications');
    }
};

export const markNotificationsAsRead = async (uid: string) => {
    if (!isFirebaseConfigured || !db || !uid || uid === 'anonymous' || uid === 'guest') return;

    // Guard: Only mark if authenticated and UID matches
    if (!auth?.currentUser || auth.currentUser.uid !== uid) {
        return;
    }

    try {
        const snap = await getDocs(query(collection(db, 'notifications'), where('recipientId', '==', uid), where('isRead', '==', false)));
        for (const d of snap.docs) {
            await updateDoc(doc(db, 'notifications', d.id), { isRead: true });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
};
export const getSavedPosts = async (uid: string) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const snap = await getDocs(query(collection(db, 'posts'), where('saves', 'array-contains', uid)));
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Post)).sort((a,b) => b.timestamp - a.timestamp);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'posts');
        return [];
    }
};

export const shareToGroup = async (groupId: string, senderId: string, content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', mediaUrl?: string) => {
    if (!db) return;
    const message: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId,
        text: content,
        timestamp: Date.now(),
        fileType: type,
        fileUrl: mediaUrl
    };
    try {
        const chatRef = doc(db, 'chats', groupId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
            await updateDoc(chatRef, {
                messages: arrayUnion(message)
            });
        } else if (groupId.startsWith('dm-')) {
            // Cria chat automático para DM se não existir
            const participants = groupId.replace('dm-', '').split('-');
            const newChat: ChatConversation = {
                id: groupId,
                type: ChatType.PRIVATE,
                participants,
                messages: [message],
            };
            await setDoc(chatRef, newChat);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'chats/' + groupId);
    }
};

export const subscribeToLivePost = (id: string, cb: any) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, 'posts', id), (d) => cb(d.data()));
};
export const sendLiveMessage = async (id: string, msg: any) => {
    if (!db) return;
    const d = await getDoc(doc(db, 'posts', id));
    if (d.exists()) {
        await updateDoc(doc(db, 'posts', id), { liveChat: [...(d.data().liveChat || []), msg] });
    }
};
export const manageLiveViewers = (id: string, action: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', id);
    getDoc(ref).then(d => {
        if(d.exists()) {
            const cur = d.data().liveViewerCount || 0;
            updateDoc(ref, { liveViewerCount: Math.max(0, action === 'join' ? cur + 1 : cur - 1) });
        }
    });
};
export const pulseLiveHeart = (id: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', id);
    getDoc(ref).then(d => {
        if(d.exists()) {
            updateDoc(ref, { liveHeartCount: (d.data().liveHeartCount || 0) + 1 });
        }
    });
};

// FIX: Added optional description to match call in LiveStreamViewer
export const processDonation = async (from: string, to: string, amt: number, description?: string) => {
    if (!db) return false;
    await checkUserFrozen(from);
    const u1 = await findUserById(from);
    const u2 = await findUserById(to);
    if(u1 && u2 && u1.balance! >= amt){
        await updateDoc(doc(db, 'profiles', from), { balance: u1.balance! - amt });
        await updateDoc(doc(db, 'profiles', to), { balance: u2.balance! + amt });
        await addDoc(collection(db, 'transactions'), {
            id: generateUUID(),
            userId: from,
            amount: -amt,
            type: TransactionType.DONATION,
            description: description || `Donation to user ${to}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const findAudioTrackById = async (id: string): Promise<AudioTrack | undefined> => {
    if (!db || !id) return undefined;
    try {
        const docSnap = await getDoc(doc(db, 'audio_tracks', id));
        if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id } as AudioTrack;
        }
    } catch (error) {
        console.error("Error fetching audio track:", error);
    }
    return undefined;
};
export const unpinPost = async (id: string) => {
    if (!db) return;
    return updateDoc(doc(db, 'posts', id), { isPinned: false });
};
export const pinPost = async (id: string) => {
    if (!db) return;
    return updateDoc(doc(db, 'posts', id), { isPinned: true });
};
export const createReport = async (r: any) => {
    if (!db) return;
    return addDoc(collection(db, 'reports'), r);
};
export const updatePostShares = async (pid: string, uid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const shares = d.data().shares || [];
        if (!shares.includes(uid)) {
            await updateDoc(ref, { shares: [...shares, uid] });
        }
    }
};
export const adminDeleteProduct = async (id: string) => {
    if (!db) return;
    return deleteDoc(doc(db, 'products', id));
};
export const updateSaleStatus = async (id: string, s: any) => {
    if (!db) return;
    await updateDoc(doc(db, 'sales', id), { status: s });
};
export const updateSaleTracking = async (id: string, c: string, sid?: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'sales', id), { trackingCode: c, supplierOrderId: sid || '' });
};

export const processUserUpgrade = async (uid: string, u: User, f: File, c: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'profiles', uid), { isVerified: true });
};
export const updateUserData = async (userId: string, data: Partial<User>) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'profiles', userId), {
            ...data,
            updatedAt: Date.now()
        });
        
        // Se documentId foi atualizado (e aprovado/verificado), registra no registry
        if (data.documentId) {
            await registerUniqueness('documentId', data.documentId, userId);
        }
        if (data.email) {
            await registerUniqueness('email', data.email, userId);
        }
        if (data.phone) {
            await registerUniqueness('phone', data.phone, userId);
        }
        
        // Se houver mudanças públicas, atualiza public_profiles tbm
        const publicKeys: (keyof User)[] = ['firstName', 'lastName', 'profilePicture', 'coverPhoto', 'bio', 'isVerified', 'isOnline', 'userType', 'idVerificationStatus', 'balance'];
        const publicUpdate: any = {};
        let hasPublicChange = false;
        
        publicKeys.forEach(key => {
            if (data[key] !== undefined) {
                publicUpdate[key] = data[key];
                hasPublicChange = true;
            }
        });
        
        if (hasPublicChange) {
            await updateDoc(doc(db, 'public_profiles', userId), publicUpdate);
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'profiles/' + userId);
    }
};

export const updateUser = async (u: User) => {
    const path = 'profiles';
    const publicPath = 'public_profiles';
    if (!db) return;
    try {
        // Update private profile
        const { email, phone, documentId, birthDate, balance, ...publicData } = u;
        await updateDoc(doc(db, path, u.id), u as any);

        // Update public profile (only public fields)
        await updateDoc(doc(db, publicPath, u.id), publicData as any);

        // Update Firebase Auth profile if it's the current user
        if (auth?.currentUser && auth.currentUser.uid === u.id) {
            await updateProfile(auth.currentUser, {
                displayName: `${u.firstName} ${u.lastName}`,
                photoURL: u.profilePicture
            });
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
    }
};
export const deleteUser = async (id: string) => {
    if (!db) return;

    try {
        console.log(`[STORAGE] Iniciando exclusão em cascata profunda para o usuário: ${id}`);
        
        // 1. Deletar os perfis principais IMEDIATAMENTE (mais crítico)
        const profileRef = doc(db!, 'profiles', id);
        const publicProfileRef = doc(db!, 'public_profiles', id);
        const adminRef = doc(db!, 'admins', id);

        await Promise.all([
            deleteDoc(profileRef).catch(e => console.warn("Erro ao deletar profiles/", id, e)),
            deleteDoc(publicProfileRef).catch(e => console.warn("Erro ao deletar public_profiles/", id, e)),
            deleteDoc(adminRef).catch(e => console.warn("Erro ao deletar admins/", id, e))
        ]);

        // 2. Limpeza de coleções de conteúdo (paralelo)
        const collectionsToClean = [
            { name: 'posts', field: 'userId' },
            { name: 'products', field: 'userId' },
            { name: 'stores', field: 'professorId' },
            { name: 'stories', field: 'userId' },
            { name: 'events', field: 'creatorId' },
            { name: 'ad_campaigns', field: 'professorId' },
            { name: 'ads', field: 'professorId' },
            { name: 'transactions', field: 'userId' },
            { name: 'notifications', field: 'recipientId' },
            { name: 'notifications', field: 'actorId' },
            { name: 'reports', field: 'reporterId' },
            { name: 'reports', field: 'targetId' },
            { name: 'support_tickets', field: 'userId' },
            { name: 'tickets', field: 'userId' },
            { name: 'sales', field: 'buyerId' },
            { name: 'sales', field: 'sellerId' },
            { name: 'affiliate_links', field: 'affiliateId' },
            { name: 'affiliate_links', field: 'sellerId' },
            { name: 'affiliate_sales', field: 'buyerId' },
            { name: 'affiliate_sales', field: 'affiliateUserId' },
            { name: 'affiliate_sales', field: 'sellerId' },
            { name: 'blocks', field: 'blockerId' },
            { name: 'blocks', field: 'blockedId' },
            { name: 'system_logs', field: 'adminId' },
            { name: 'system_logs', field: 'targetId' },
            { name: 'payment_cards', field: 'userId' },
            { name: 'calls', field: 'callerId' },
            { name: 'calls', field: 'receiverId' }
        ];

        const deletePromises = collectionsToClean.map(async (col) => {
            try {
                const q = query(collection(db!, col.name), where(col.field, '==', id));
                const snap = await getDocs(q);
                const batchPromises = snap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(batchPromises);
            } catch (err) {
                console.warn(`Erro limpando coleção ${col.name}:`, err);
            }
        });

        // 3. Limpeza de Registro de Unicidade (E-mail e Documento)
        const registryCleanup = (async () => {
            try {
                const registryDocs = await getDocs(query(collection(db!, 'uniqueness_registry'), where('userId', '==', id)));
                await Promise.all(registryDocs.docs.map(d => deleteDoc(d.ref)));
            } catch (err) {
                console.warn("Erro limpando uniqueness_registry:", err);
            }
        })();

        // 3. Limpeza especializada de chats (remover dos participantes)
        const chatPromises = (async () => {
            try {
                const q = query(collection(db!, 'chats'), where('participants', 'array-contains', id));
                const snap = await getDocs(q);
                for (const d of snap.docs) {
                    const chat = d.data();
                    const newParticipants = (chat.participants || []).filter((p: string) => p !== id);
                    if (newParticipants.length === 0 || (chat.type === ChatType.PRIVATE && newParticipants.length < 2)) {
                        await deleteDoc(d.ref);
                    } else {
                        const update: any = { participants: newParticipants };
                        if (chat.adminId === id) {
                            update.adminId = newParticipants[0]; // Transferir admin se o admin saiu
                        }
                        await updateDoc(d.ref, update);
                    }
                }
            } catch (err) {
                console.warn("Erro limpando chats:", err);
            }
        })();

        // 4. Limpeza de Arrays Sociais em outros perfis (Seguidores), Eventos e Stories
        const socialCleanup = (async () => {
            try {
                const followerQuery = query(collection(db!, 'profiles'), where('followers', 'array-contains', id));
                const followedQuery = query(collection(db!, 'profiles'), where('followedUsers', 'array-contains', id));
                const publicFollowerQuery = query(collection(db!, 'public_profiles'), where('followers', 'array-contains', id));
                const publicFollowedQuery = query(collection(db!, 'public_profiles'), where('followedUsers', 'array-contains', id));
                const eventQuery = query(collection(db!, 'events'), where('attendees', 'array-contains', id));
                const storyQuery = query(collection(db!, 'stories'), where('views', 'array-contains', id));

                const [f1, f2, f3, f4, evSnap, stSnap] = await Promise.all([
                    getDocs(followerQuery), getDocs(followedQuery),
                    getDocs(publicFollowerQuery), getDocs(publicFollowedQuery),
                    getDocs(eventQuery), getDocs(storyQuery)
                ]);

                const updates = [
                    ...f1.docs.map(d => updateDoc(d.ref, { followers: arrayRemove(id) })),
                    ...f2.docs.map(d => updateDoc(d.ref, { followedUsers: arrayRemove(id) })),
                    ...f3.docs.map(d => updateDoc(d.ref, { followers: arrayRemove(id) })),
                    ...f4.docs.map(d => updateDoc(d.ref, { followedUsers: arrayRemove(id) })),
                    ...evSnap.docs.map(d => updateDoc(d.ref, { attendees: arrayRemove(id), attendeesCount: increment(-1) })),
                    ...stSnap.docs.map(d => updateDoc(d.ref, { views: arrayRemove(id) }))
                ];
                await Promise.all(updates);
            } catch (err) {
                console.warn("Erro na limpeza social:", err);
            }
        })();

        // 5. Limpeza de Curtidas/Interações em POSTS de outros usuários
        const postInteractions = (async () => {
            try {
                const qLikes = query(collection(db!, 'posts'), where('likes', 'array-contains', id));
                const qSaves = query(collection(db!, 'posts'), where('saves', 'array-contains', id));
                const qIndicates = query(collection(db!, 'posts'), where('indicatedUserIds', 'array-contains', id));
                
                const [s1, s2, s3] = await Promise.all([getDocs(qLikes), getDocs(qSaves), getDocs(qIndicates)]);
                
                const updates = [
                    ...s1.docs.map(d => updateDoc(d.ref, { likes: arrayRemove(id) })),
                    ...s2.docs.map(d => updateDoc(d.ref, { saves: arrayRemove(id) })),
                    ...s3.docs.map(d => updateDoc(d.ref, { indicatedUserIds: arrayRemove(id) }))
                ];
                await Promise.all(updates);
            } catch (err) {
                console.warn("Erro na limpeza de interações em posts:", err);
            }
        })();

        // 6. Limpeza de Comentários (Esforço máximo em posts recentes)
        const commentCleanup = (async () => {
            try {
                const recentPosts = await getDocs(query(collection(db!, 'posts'), limit(500))); // Aumentado para 500
                const updates = recentPosts.docs.map(async (d) => {
                    const post = d.data();
                    if (post.comments && Array.isArray(post.comments)) {
                        const filterComments = (list: any[]): any[] => {
                            return list.filter(c => c.userId !== id).map(c => ({
                                ...c,
                                replies: c.replies ? filterComments(c.replies) : []
                            }));
                        };
                        const newComments = filterComments(post.comments);
                        if (safeJsonStringify(newComments) !== safeJsonStringify(post.comments)) {
                            return updateDoc(d.ref, { comments: newComments });
                        }
                    }
                });
                await Promise.all(updates);
            } catch (err) {
                console.warn("Erro na limpeza de comentários:", err);
            }
        })();

        // Rodar tudo e limpar cache no fim
        await Promise.all([...deletePromises, chatPromises, registryCleanup, socialCleanup, postInteractions, commentCleanup]);
        
        localStorage.removeItem('cyber_product_cache');
        localStorage.removeItem('cyberphone_current_user_id');

        console.log(`[STORAGE] Remoção em cascata concluída com sucesso para: ${id}`);
        return true;
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `full_purge/${id}`);
        throw error;
    }
};
export const updateUserPassword = async (p: string) => {};

// FIX: Added missing exported members
export const getEvents = async (limitCount?: number, startDoc?: QueryDocumentSnapshot): Promise<PaginatedResult<CyberEvent>> => {
    if (!db) return { items: [], lastDoc: null, hasMore: false };
    try {
        let q = query(collection(db, 'events'), orderBy('startDate', 'asc')); // Eventos futuros primeiro
        
        if (startDoc) {
          q = query(q, startAfter(startDoc));
        }
        
        if (limitCount) {
          q = query(q, limit(limitCount + 1));
        }

        const snap = await getDocs(q);
        let docs = snap.docs;
        const hasMore = limitCount ? docs.length > limitCount : false;
        
        if (hasMore) {
            docs = docs.slice(0, limitCount);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const items = docs.map(d => ({ ...d.data(), id: d.id } as CyberEvent));

        return {
            items,
            lastDoc: lastDoc as QueryDocumentSnapshot | null,
            hasMore
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'events');
        return { items: [], lastDoc: null, hasMore: false };
    }
};
export const createEvent = async (evt: CyberEvent) => {
    if (!db) return;
    await setDoc(doc(db, 'events', evt.id), evt);
};
export const toggleJoinEvent = async (eId: string, uId: string) => {
    if (!db) return;
    const ref = doc(db, 'events', eId);
    const d = await getDoc(ref);
    if(d.exists()){
        const attendees = d.data().attendees || [];
        const newAttendees = attendees.includes(uId) ? attendees.filter((id:any)=>id!==uId) : [...attendees, uId];
        await updateDoc(ref, { attendees: newAttendees });
    }
};

export const sendMessage = async (chatId: string, msg: Message) => {
    if (!db) return;

    // Sentinela AI Check (apenas texto)
    if (msg.text) {
        const security = await checkContentSecurity(msg.text, 'message');
        if (!security.allowed) {
            // Se for fraude detectada pelo Sentinela, bloqueamos as contas
            if (security.isFraud) {
                const refChat = doc(db, 'chats', chatId);
                const dChat = await getDoc(refChat);
                if (dChat.exists()) {
                    const chatData = dChat.data();
                    const participants = chatData.participants || [];
                    // Bloqueia todos os participantes da conversa suspeita
                    for (const pId of participants) {
                        await updateDoc(doc(db, 'profiles', pId), { isFrozen: true });
                    }
                }
            }
            throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
        }
    }

    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const chatData = d.data();
        
        // Block Check for Private Chats
        if (chatData.type === ChatType.PRIVATE) {
            const senderId = msg.senderId;
            const receiverId = (chatData.participants || []).find((p: string) => p !== senderId);
            
            if (receiverId) {
                const [senderProfile, receiverProfile] = await Promise.all([
                    findUserById(senderId),
                    findUserById(receiverId)
                ]);
                
                if (senderProfile?.blockedUserIds?.includes(receiverId)) {
                    throw new Error("BLOCK: Você bloqueou este usuário.");
                }
                if (receiverProfile?.blockedUserIds?.includes(senderId)) {
                    throw new Error("BLOCK: Este usuário bloqueou você.");
                }
            }
        }

        await updateDoc(ref, { messages: [...(chatData.messages || []), msg] });
    }
};

export const deleteMessage = async (chatId: string, messageId: string, hardDelete?: boolean) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        let messages = d.data().messages || [];
        if (hardDelete) {
            messages = messages.filter((m: any) => m.id !== messageId);
        } else {
            messages = messages.map((m: any) => m.id === messageId ? { ...m, isDeleted: true, text: undefined, imageUrl: undefined, fileUrl: undefined } : m);
        }
        await updateDoc(ref, { messages });
    }
};

export const editMessage = async (chatId: string, messageId: string, text: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const messages = (d.data().messages || []).map((m: any) => m.id === messageId ? { ...m, text, isEdited: true } : m);
        await updateDoc(ref, { messages });
    }
};

export const updateGroupTheme = async (chatId: string, theme: GroupTheme) => {
    if (!db) return;
    await updateDoc(doc(db, 'chats', chatId), { theme });
};

export const leaveGroup = async (chatId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const participants = (d.data().participants || []).filter((id:any) => id !== userId);
        await updateDoc(ref, { participants });
    }
};

export const deleteChat = async (chatId: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'chats', chatId));
};

export const startPrivateChat = async (uid1: string, uid2: string) => {
    if (!db) return;
    
    // Busca chats onde uid1 participa (não requer índice composto se for único filtro)
    const q = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', uid1)
    );
    const snap = await getDocs(q);
    
    // Filtra pelo tipo e segundo participante localmente para evitar erro de índice ausente
    let chat = snap.docs.find(d => {
        const data = d.data();
        const p = data.participants || [];
        return data.type === ChatType.PRIVATE && p.includes(uid2);
    });

    if (chat) return chat.id;

    // Se não existir, cria um novo
    const id = generateUUID();
    await setDoc(doc(db, 'chats', id), {
        id,
        type: ChatType.PRIVATE,
        participants: [uid1, uid2],
        messages: [],
        timestamp: Date.now(),
        theme: 'blue'
    });
    return id;
};

export const markChatMessagesAsRead = async (chatId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'chats', chatId);
    const d = await getDoc(ref);
    if(d.exists()){
        const messages = (d.data().messages || []).map((m: any) => m.senderId !== userId ? { ...m, isRead: true } : m);
        await updateDoc(ref, { messages });
    }
};

export const getUnreadMessagesCount = async (userId: string): Promise<number> => {
    if (!db || !userId || userId === 'anonymous' || userId === 'guest') return 0;

    // Guard: Only fetch if authenticated and UID matches
    if (!auth?.currentUser || auth.currentUser.uid !== userId) {
        return 0;
    }

    try {
        const snap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', userId)));
        let count = 0;
        snap.docs.forEach(d => {
            const data = d.data();
            const messages = data.messages || [];
            messages.forEach((m: any) => {
                if (m.senderId !== userId && !m.isRead) {
                    count++;
                }
            });
        });
        return count;
    } catch (e) {
        return 0;
    }
};

/**
 * Funções de Monetização (Modelo YouTube)
 */
export const incrementWatchTime = async (userId: string, seconds: number, isPremiumViewer: boolean = false) => {
    if (!db || !userId || !auth?.currentUser) return;
    try {
        const userRef = doc(db, 'public_profiles', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        
        const data = userSnap.data();
        const goals = data.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: data.followers?.length || 0,
            currentWatchHours: 0,
            currentShortsViews: 0,
            termsAccepted: false,
            verificationStep: data.idVerificationStatus === 'APPROVED'
        };

        const currentHours = goals.currentWatchHours || 0;
        const additionalHours = seconds / 3600;
        
        const updateData: any = {};
        if (!data.monetizationGoals) {
            updateData.monetizationGoals = {
                ...goals,
                currentWatchHours: currentHours + additionalHours
            };
        } else {
            updateData['monetizationGoals.currentWatchHours'] = currentHours + additionalHours;
        }

        await updateDoc(userRef, updateData);
        // Sync with private profile as best effort
        updateDoc(doc(db, 'profiles', userId), updateData).catch(() => {});

        if (isPremiumViewer && data.isMonetized) {
            import('./monetizationService').then(m => {
                m.monetizationService.distributePremiumRevenue(userId, seconds);
            });
        }
    } catch (e) {
        console.error("Erro ao incrementar tempo de exibição:", e);
    }
};

export const incrementShortsView = async (userId: string) => {
    if (!db || !userId) return;
    try {
        const userRef = doc(db, 'public_profiles', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        
        const data = userSnap.data();
        const goals = data.monetizationGoals || {
            followersGoal: 1000,
            watchHoursGoal: 4000,
            shortsViewsGoal: 10000000,
            currentFollowers: data.followers?.length || 0,
            currentWatchHours: 0,
            currentShortsViews: 0,
            termsAccepted: false,
            verificationStep: data.idVerificationStatus === 'APPROVED'
        };

        const currentViews = goals.currentShortsViews || 0;
        
        const updateData: any = {};
        if (!data.monetizationGoals) {
            updateData.monetizationGoals = {
                ...goals,
                currentShortsViews: currentViews + 1
            };
        } else {
            updateData['monetizationGoals.currentShortsViews'] = currentViews + 1;
        }

        await updateDoc(userRef, updateData);
    } catch (e) {
        console.error("Erro ao incrementar views de shorts:", e);
    }
};

export const getActiveAds = async (): Promise<AdCampaign[]> => {
    if (!db) return [];
    try {
        const adsRef = collection(db, 'ads');
        const q = query(adsRef, where('isActive', '==', true), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdCampaign));
    } catch (e) {
        console.error("Error getting active ads:", e);
        return [];
    }
};

export const checkAndProcessAdBilling = async (userId: string) => {
    if (!db || !userId || userId === 'anonymous') return;
    
    try {
        const adsRef = collection(db, 'ads');
        const q = query(adsRef, where('professorId', '==', userId), where('isActive', '==', true));
        const snap = await getDocs(q);
        const ads = snap.docs.map(d => ({ ...d.data(), id: d.id } as AdCampaign));
        
        const now = Date.now();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        
        for (const ad of ads) {
            // Se não tiver campos novos, inicializa para evitar erros
            const endDate = ad.endDate || (ad.timestamp + (7 * oneDayInMs));
            const isAutoRenew = ad.isAutoRenew !== undefined ? ad.isAutoRenew : true;
            const renewalAmount = ad.renewalAmount || ad.budget || 0;

            // 1. Notificação de término iminente (24h antes do endDate)
            if (endDate - now <= oneDayInMs && endDate - now > 0 && !ad.notifiedRenewal) {
                await createNotification(
                    userId,
                    'SYSTEM_AD',
                    NotificationType.MESSAGE,
                    undefined,
                    'CyberPhone Ads',
                );
                
                // Marcar como notificado
                await updateDoc(doc(db, 'ads', ad.id), { notifiedRenewal: true });
                console.log(`[ADS] Usuário ${userId} notificado sobre renovação do anúncio ${ad.id}`);
            }
            
            // 2. Processar Expiração ou Renovação
            if (now >= endDate) {
                if (isAutoRenew) {
                    const user = await findUserById(userId);
                    if (user && (user.balance || 0) >= renewalAmount && renewalAmount > 0) {
                        // Débito
                        const newBalance = (user.balance || 0) - renewalAmount;
                        await updateDoc(doc(db, 'profiles', userId), { balance: newBalance });
                        await updateDoc(doc(db, 'public_profiles', userId), { balance: newBalance });
                        
                        // Log
                        const txId = generateUUID();
                        await setDoc(doc(db, 'transactions', txId), {
                            id: txId,
                            userId,
                            amount: -renewalAmount,
                            type: TransactionType.PURCHASE,
                            description: `Renovação Automática de Anúncio: ${ad.title}`,
                            status: 'COMPLETED',
                            timestamp: now
                        });
                        
                        // Estender
                        const cycleDays = ad.billingCycle === 'WEEKLY' ? 7 : 1;
                        const newDuration = cycleDays * oneDayInMs;
                        
                        await updateDoc(doc(db, 'ads', ad.id), {
                            endDate: endDate + newDuration,
                            lastBillingDate: now,
                            notifiedRenewal: false,
                            budget: increment(renewalAmount) // Incrementa o gasto total reportado
                        });
                        
                        console.log(`[ADS] Anúncio ${ad.id} renovado com sucesso para ${userId}`);
                    } else {
                        // Saldo insuficiente, desativa
                        await updateDoc(doc(db, 'ads', ad.id), { isActive: false });
                        console.log(`[ADS] Anúncio ${ad.id} desativado por falta de saldo`);
                        
                        await createNotification(
                            userId,
                            'SYSTEM_AD',
                            NotificationType.MESSAGE,
                            undefined,
                            'CyberPhone Ads: Sua campanha foi pausada por falta de saldo.'
                        );
                    }
                } else {
                    // Sem renovação automática, desativa
                    await updateDoc(doc(db, 'ads', ad.id), { isActive: false });
                    console.log(`[ADS] Anúncio ${ad.id} expirou e foi desativado (Sem Auto-Renovação)`);
                }
            } else if (isAutoRenew) {
                // Checagem extra: se já estiver perto do fim (ex: menos de 2h) e o saldo atual for ZERO, podemos alertar mais agressivamente
                // Mas por enquanto vamos manter a integridade do período pago.
            }
        }
    } catch (err) {
        console.error("[ADS] Erro ao processar cobrança de anúncios:", err);
    }
};

export const toggleAdActive = async (adId: string, userId: string, active: boolean) => {
    if (!db || !userId) return;
    
    // Se estiver tentando ativar, verificar saldo
    if (active) {
        const adSnap = await getDoc(doc(db, 'ads', adId));
        if (adSnap.exists()) {
            const ad = adSnap.data() as AdCampaign;
            const user = await findUserById(userId);
            const renewalAmount = ad.renewalAmount || ad.budget || 0;
            
            if (!user || (user.balance || 0) < renewalAmount) {
                throw new Error("Saldo insuficiente para reativar esta campanha. Adicione fundos à sua carteira.");
            }
        }
    }

    await updateDoc(doc(db, 'ads', adId), { isActive: active });
};

export const createAd = async (ad: AdCampaign) => {
    if (!db) return;
    
    // Garantir campos de ciclo de vida no momento da criação
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    // Se não vier definido, calculamos baseado no que foi passado
    const cycleDays = ad.billingCycle === 'WEEKLY' ? 7 : 1;
    
    const enhancedAd = {
        ...ad,
        startDate: ad.startDate || now,
        lastBillingDate: ad.lastBillingDate || now,
        endDate: ad.endDate || (now + (cycleDays * oneDayInMs)),
        isAutoRenew: ad.isAutoRenew !== undefined ? ad.isAutoRenew : true,
        notifiedRenewal: false,
        renewalAmount: ad.renewalAmount || ad.budget
    };

    await setDoc(doc(db, 'ads', ad.id), enhancedAd);
};

export const checkUserFrozen = async (userId: string) => {
    const user = await findUserById(userId);
    if (user?.isFrozen) {
        throw new Error("SENTINEL_BLOCK: Sua conta está bloqueada para transações financeiras devido a atividades suspeitas monitoradas pelo Sentinela.");
    }
    return false;
};

export const processAdInvestment = async (userId: string, amount: number, title: string) => {
    if (!db) return false;
    await checkUserFrozen(userId);
    const user = await findUserById(userId);
    if (user && user.balance! >= amount) {
        await updateDoc(doc(db, 'profiles', userId), { balance: user.balance! - amount });
        await addDoc(collection(db, 'transactions'), {
            id: generateUUID(),
            userId,
            amount: -amount,
            type: TransactionType.PURCHASE,
            description: `Ad: ${title}`,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const getStores = async () => {
    if (!db) return [];
    try {
        return (await getDocs(collection(db, 'stores'))).docs.map(d => d.data() as Store);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stores');
        return [];
    }
};

export const createStore = async (store: Store) => {
    if (!db) return false;
    await checkUserFrozen(store.professorId);

    // Store Creation Fee Check
    try {
        const settings = await getGlobalSettings();
        const fee = settings.storeCreationFee || 0;
        if (fee > 0) {
            const userRef = doc(db, 'profiles', store.professorId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return false;
            
            const userData = userDoc.data();
            const balance = userData.balance || 0;
            
            if (balance < fee) return false;
            
            // Deduct
            const newBalance = balance - fee;
            await updateDoc(userRef, { balance: newBalance });
            await updateDoc(doc(db, 'public_profiles', store.professorId), { balance: newBalance });
            
            // Log
            const txId = generateUUID();
            await setDoc(doc(db, 'transactions', txId), {
                id: txId,
                userId: store.professorId,
                amount: -fee,
                type: 'PLATFORM_FEE',
                description: `Criação de Loja: ${store.name}`,
                status: 'COMPLETED',
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error("Store fee error:", e);
    }

    await setDoc(doc(db, 'stores', store.id), store);
    return true;
};

export const updateStore = async (store: Store) => {
    if (!db) return;
    await updateDoc(doc(db, 'stores', store.id), store as any);
};

export const getAudioTracks = async () => [];

export const getSalesByAffiliateId = async (uid: string) => {
    if (!db) return [];
    try {
        return (await getDocs(query(collection(db, 'sales'), where('affiliateUserId', '==', uid)))).docs.map(d => ({ ...d.data(), id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'sales (affiliate)');
        return [];
    }
};

export const getAffiliateLinks = async (uid?: string, sellerId?: string): Promise<AffiliateLink[]> => {
    if (!db) return [];
    try {
        let q: any = collection(db, 'affiliate_links');
        if (uid) {
            q = query(q, where('affiliateId', '==', uid));
        } else if (sellerId) {
            q = query(q, where('sellerId', '==', sellerId));
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data() as any;
            return { ...data, id: d.id } as AffiliateLink;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'affiliate_links');
        return [];
    }
};

export const saveAffiliateLink = async (affiliateId: string, productId: string, link: string, sellerId: string) => {
    if (!db) return;
    const id = `${affiliateId}_${productId}`;
    const affiliateLink: AffiliateLink = {
        id,
        affiliateId,
        productId,
        sellerId,
        link,
        clicks: 0,
        timestamp: Date.now()
    };
    await setDoc(doc(db, 'affiliate_links', id), affiliateLink);
};

export const removeAffiliateLink = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'affiliate_links', id));
};

export const trackAffiliateClick = async (affiliateId: string, productId: string) => {
    if (!db) return;
    const linkId = `${affiliateId}_${productId}`;
    try {
        const linkRef = doc(db, 'affiliate_links', linkId);
        const linkDoc = await getDoc(linkRef);
        if (linkDoc.exists()) {
            await updateDoc(linkRef, {
                clicks: increment(1)
            });
        }
    } catch (error) {
        console.error("Erro ao rastrear clique de afiliado:", error);
    }
};

export const addToCart = (productId: string, quantity: number = 1, selectedColor?: string, affiliateId?: string, product?: Product) => {
    const cart = getCart();
    
    // Se passarmos o objeto do produto, salvamos no cache para o carrinho carregar instantâneo
    if (product) {
        const localCache = JSON.parse(localStorage.getItem('cyber_product_cache') || '{}');
        localCache[productId] = product;
        localStorage.setItem('cyber_product_cache', safeJsonStringify(localCache));
    }

    const existingItem = cart.find((item: any) => item.productId === productId && item.selectedColor === selectedColor);
    if (existingItem) {
        existingItem.quantity += quantity;
        if (affiliateId) existingItem.affiliateId = affiliateId;
    } else {
        cart.push({ productId, quantity, selectedColor, affiliateId });
    }
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const updateCartItemQuantity = (pid: string, qty: number) => {
    let cart = getCart();
    if (qty <= 0) cart = cart.filter((i:any) => i.productId !== pid);
    else {
        const item = cart.find((i:any) => i.productId === pid);
        if (item) item.quantity = qty;
    }
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const removeFromCart = (pid: string) => {
    const cart = getCart().filter((i:any) => i.productId !== pid);
    localStorage.setItem('cyberphone_cart', safeJsonStringify(cart));
};

export const clearCart = () => {
    localStorage.setItem('cyberphone_cart', '[]');
};

let isProcessingPurchase = false;

export const processProductPurchase = async (items: CartItem[], buyerId: string, affiliateId: string | null, address: ShippingAddress, isBalancePayment: boolean = true, carrier?: { id: string; name: string }) => {
    if (!db || isProcessingPurchase || items.length === 0) return false;
    isProcessingPurchase = true;
    
    await checkUserFrozen(buyerId);
    try {
        // Persistent check to prevent duplicate clicks across tabs or rapid retries
        const lastPurchaseDoc = await getDoc(doc(db, 'purchase_locks', buyerId));
        const now = Date.now();
        if (lastPurchaseDoc.exists()) {
            const lastTime = lastPurchaseDoc.data().timestamp;
            if (now - lastTime < 5000) {
                 console.warn("Duplicate purchase attempt blocked for user:", buyerId);
                 isProcessingPurchase = false;
                 return false;
            }
        }
        await setDoc(doc(db, 'purchase_locks', buyerId), { timestamp: now });

        const settings = await getGlobalSettings();
        const platformTax = settings.platformTax / 100;
        const batchTimestamp = Date.now();
        const batchId = generateUUID();

        // 0. Deduplicate items to prevent multiple orders for the same product entry
        const consolidatedItems: CartItem[] = [];
        items.forEach(item => {
            const existing = consolidatedItems.find(ci => ci.productId === item.productId && ci.selectedColor === item.selectedColor);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                consolidatedItems.push({ ...item });
            }
        });

        for (const item of consolidatedItems) {
            const productDoc = await getDoc(doc(db, 'products', item.productId));
            if (!productDoc.exists()) continue;
            const product = productDoc.data() as Product;
            
            const storeDoc = await getDoc(doc(db, 'stores', product.storeId));
            if (!storeDoc.exists()) continue;
            const store = storeDoc.data() as Store;
            const sellerId = store.professorId;

            // Include shipping fee in total calculation for physical products
            const shippingCost = (product.type === ProductType.PHYSICAL && !product.hasFreeShipping) 
                ? (product.shippingFee || 0) 
                : 0;
            
            const totalAmount = (product.price * item.quantity) + shippingCost;
            const saleId = generateUUID();

            // 1. Create Sale Record
            const initialStatus = product.type === ProductType.PHYSICAL ? OrderStatus.WAITLIST : OrderStatus.DELIVERED;
            
            // Calculamos ganhos antecipadamente para salvar no registro da venda (Escrow)
            let sellerEarnings = totalAmount * (1 - platformTax);
            let affiliateEarnings = 0;

            const finalAffiliateId = item.affiliateId || affiliateId;

            if (finalAffiliateId && product.affiliateCommissionRate > 0) {
                affiliateEarnings = totalAmount * (product.affiliateCommissionRate / 100);
                sellerEarnings -= affiliateEarnings;
            }

            await setDoc(doc(db, 'sales', saleId), {
                id: saleId,
                productId: item.productId,
                productName: product.name,
                buyerId,
                sellerId,
                affiliateUserId: finalAffiliateId || '',
                storeId: product.storeId,
                timestamp: batchTimestamp,
                status: initialStatus,
                shippingAddress: address,
                saleAmount: totalAmount,
                sellerEarnings, // Guardamos para liberar depois
                affiliateEarnings, // Guardamos para liberar depois
                fundsReleased: false, // SISTEMA DE CUSTÓDIA ATIVADO
                carrierId: carrier?.id || '',
                carrierName: carrier?.name || '',
                batchId
            });

            // 1.1 Update Pending Balances for Seller
            const sellerRef = doc(db, 'profiles', sellerId);
            await updateDoc(sellerRef, {
                pendingBalance: increment(sellerEarnings),
                totalEarnings: increment(sellerEarnings)
            });

            // 1.2 Update Pending Balances for Affiliate
            if (finalAffiliateId && affiliateEarnings > 0) {
                const affiliateRef = doc(db, 'profiles', finalAffiliateId);
                await updateDoc(affiliateRef, {
                    pendingBalance: increment(affiliateEarnings),
                    totalEarnings: increment(affiliateEarnings)
                });
            }

            // 2. Handle Buyer Balance (Deducting immediately)
            if (isBalancePayment) {
                const buyerRef = doc(db, 'profiles', buyerId);
                await updateDoc(buyerRef, {
                    balance: increment(-totalAmount)
                });

                // Create Buyer Transaction
                const buyTransId = generateUUID();
                await setDoc(doc(db, 'transactions', buyTransId), {
                    id: buyTransId,
                    userId: buyerId,
                    type: TransactionType.PURCHASE,
                    amount: -totalAmount,
                    description: `Compra de produto: ${product.name} (Aguardando Recebimento)`,
                    timestamp: batchTimestamp,
                    status: 'COMPLETED'
                });
            }

            // Increment Product Sold Count
            await updateDoc(doc(db, 'products', item.productId), {
                soldCount: (product.soldCount || 0) + item.quantity
            });
        }

        clearCart();
        isProcessingPurchase = false;
        return true;
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'processProductPurchase');
        isProcessingPurchase = false;
        return false;
    }
};

export const getDisputedSales = async () => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), where('status', '==', OrderStatus.DISPUTED));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as AffiliateSale));
    } catch (error) {
        return [];
    }
};

export const releaseFundsToSeller = async (saleId: string) => {
    if (!db) return;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        if (!saleDoc.exists()) throw new Error("Venda não encontrada");
        const sale = saleDoc.data() as any;

        if (sale.fundsReleased) return; // Já liberado

        // Liberar para o Vendedor
        if (sale.sellerEarnings > 0) {
            const sellerRef = doc(db, 'profiles', sale.sellerId);
            try {
                // USANDO increment() PARA EVITAR READ PERMISSION ERROR
                await updateDoc(sellerRef, { 
                    balance: increment(sale.sellerEarnings),
                    pendingBalance: increment(-sale.sellerEarnings)
                });
                
                // Tenta sincronizar com public_profiles
                try {
                    const publicSellerRef = doc(db, 'public_profiles', sale.sellerId);
                    await updateDoc(publicSellerRef, { balance: increment(sale.sellerEarnings) });
                } catch (pErr) {
                    console.warn("[STORAGE] Erro ao sincronizar saldo público (não crítico):", pErr);
                }

                const transId = generateUUID();
                await setDoc(doc(db, 'transactions', transId), {
                    id: transId,
                    userId: sale.sellerId,
                    type: TransactionType.SALE,
                    amount: sale.sellerEarnings,
                    description: `Fundo liberado da venda: ${saleId}`,
                    timestamp: Date.now(),
                    status: 'COMPLETED'
                });
            } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `profiles/${sale.sellerId}`);
            }
        }

        // Liberar Para o Afiliado
        if (sale.affiliateEarnings > 0 && sale.affiliateUserId) {
            const affRef = doc(db, 'profiles', sale.affiliateUserId);
            try {
                await updateDoc(affRef, { 
                    balance: increment(sale.affiliateEarnings),
                    pendingBalance: increment(-sale.affiliateEarnings)
                });

                // Tenta sincronizar com public_profiles
                try {
                    const publicAffRef = doc(db, 'public_profiles', sale.affiliateUserId);
                    await updateDoc(publicAffRef, { balance: increment(sale.affiliateEarnings) });
                } catch (pErr) {
                    console.warn("[STORAGE] Erro ao sincronizar saldo público do afiliado (não crítico):", pErr);
                }

                const transId = generateUUID();
                await setDoc(doc(db, 'transactions', transId), {
                    id: transId,
                    userId: sale.affiliateUserId,
                    type: TransactionType.SALE,
                    amount: sale.affiliateEarnings,
                    description: `Comissão liberada da venda: ${saleId}`,
                    timestamp: Date.now(),
                    status: 'COMPLETED'
                });
            } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `profiles/${sale.affiliateUserId}`);
            }
        }

        await updateDoc(saleRef, { fundsReleased: true, status: OrderStatus.COMPLETED });
    } catch (error) {
        console.error("Erro ao liberar fundos:", error);
        throw error;
    }
};

export const confirmProductReceipt = async (saleId: string) => {
    await releaseFundsToSeller(saleId);
};

export const openOrderDispute = async (saleId: string, reason: string) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        await updateDoc(saleRef, { status: OrderStatus.DISPUTED, disputeReason: reason });
        
        // Notificar um "Admin" ou sistema de Log
        await addDoc(collection(db, 'system_logs'), {
            action: 'DISPUTE_OPENED',
            details: `Disputa aberta na venda ${saleId}. Motivo: ${reason}`,
            timestamp: Date.now()
        });
        return true;
    } catch (error) {
        return false;
    }
};

export const cancelPurchaseAndRefund = async (saleId: string) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        if (!saleDoc.exists()) return false;
        const sale = saleDoc.data() as any;

        if (sale.fundsReleased) throw new Error("Fundos já foram liberados para o vendedor. Não é possível estornar automaticamente.");

        // Estornar Comprador
        const buyerRef = doc(db, 'profiles', sale.buyerId);
        const buyerDoc = await getDoc(buyerRef);
        if (buyerDoc.exists()) {
            const buyer = buyerDoc.data() as User;
            await updateDoc(buyerRef, { balance: (buyer.balance || 0) + sale.saleAmount });
            
            const transId = generateUUID();
            await setDoc(doc(db, 'transactions', transId), {
                id: transId,
                userId: sale.buyerId,
                type: TransactionType.DEPOSIT,
                amount: sale.saleAmount,
                description: `Estorno da compra: ${saleId}`,
                timestamp: Date.now(),
                status: 'COMPLETED'
            });
        }

        await updateDoc(saleRef, { status: OrderStatus.CANCELED });
        return true;
    } catch (error) {
        console.error("Erro ao cancelar e estornar:", error);
        return false;
    }
};

export const updateUserBalance = async (uid: string, amt: number) => {
    if (!db) return;
    const u = await findUserById(uid);
    if(u) await updateDoc(doc(db, 'profiles', uid), { balance: (u.balance || 0) + amt });
};

export const getPurchasesByBuyerId = async (uid: string) => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), where('buyerId', '==', uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'sales/buyer/' + uid);
        return [];
    }
};

export const getAllSales = async (limitCount: number = 100) => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'sales');
        return [];
    }
};

export const adminPurgeSales = async (userId: string, isBuyer: boolean = true, includeCompleted: boolean = false, completedOnly: boolean = false) => {
    if (!db) return false;
    try {
        const field = isBuyer ? 'buyerId' : 'storeId';
        const q = query(collection(db, 'sales'), where(field, '==', userId));
        const snap = await getDocs(q);
        
        const toDelete = snap.docs.filter(d => {
            const data = d.data() as AffiliateSale;
            if (completedOnly) return data.status === OrderStatus.COMPLETED;
            if (includeCompleted) return true;
            return data.status !== OrderStatus.COMPLETED;
        });

        if (toDelete.length === 0) return true;

        await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
        return true;
    } catch (err) {
        console.error("Error purging sales:", err);
        return false;
    }
};

export const deleteSaleRecord = async (saleId: string) => {
    if (!db) return false;
    try {
        await deleteDoc(doc(db, 'sales', saleId));
        return true;
    } catch (err) {
        console.error("Error deleting sale record:", err);
        return false;
    }
};

export const deletePurchase = async (saleId: string, isAdminOverride: boolean = false) => {
    if (!db) return false;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleSnap = await getDoc(saleRef);
        
        if (saleSnap.exists()) {
            const sale = saleSnap.data() as AffiliateSale;
            
            // Requisito: Apenas pedidos pendentes/processando podem ser cancelados, a menos que seja ADMIN
            if (!isAdminOverride && (sale.status === OrderStatus.COMPLETED || sale.status === OrderStatus.SHIPPING || sale.status === OrderStatus.DELIVERED)) {
                throw new Error("Não é possível cancelar um pedido que já foi enviado ou concluído.");
            }

            const refundAmount = (sale.saleAmount || 0) * 0.95;
            const sellerEarnings = sale.sellerEarnings || 0;
            const affiliateEarnings = sale.affiliateEarnings || 0;

            // Attempt refund (best effort)
            try {
                if (refundAmount > 0) {
                    await Promise.all([
                        updateDoc(doc(db, 'public_profiles', sale.buyerId), { balance: increment(refundAmount) }).catch(() => {}),
                        updateDoc(doc(db, 'profiles', sale.buyerId), { balance: increment(refundAmount) }).catch(() => {}),
                        addDoc(collection(db, 'transactions'), {
                            userId: sale.buyerId,
                            type: TransactionType.REFUND,
                            amount: refundAmount,
                            description: `Cancelamento de Pedido: ${saleId.slice(-6).toUpperCase()}`,
                            timestamp: Date.now(),
                            status: 'COMPLETED'
                        }).catch(() => {})
                    ]);
                }

                const balanceField = sale.fundsReleased ? 'balance' : 'pendingBalance';
                
                await Promise.all([
                    updateDoc(doc(db, 'public_profiles', sale.sellerId), { 
                        [balanceField]: increment(-sellerEarnings),
                        totalEarnings: increment(-sellerEarnings)
                    }).catch(() => {}),
                    updateDoc(doc(db, 'profiles', sale.sellerId), { 
                        [balanceField]: increment(-sellerEarnings),
                        totalEarnings: increment(-sellerEarnings)
                    }).catch(() => {})
                ]);
                
                if (sale.affiliateUserId && affiliateEarnings > 0) {
                    await Promise.all([
                        updateDoc(doc(db, 'public_profiles', sale.affiliateUserId), { 
                            [balanceField]: increment(-affiliateEarnings),
                            totalEarnings: increment(-affiliateEarnings)
                        }).catch(() => {}),
                        updateDoc(doc(db, 'profiles', sale.affiliateUserId), { 
                            [balanceField]: increment(-affiliateEarnings),
                            totalEarnings: increment(-affiliateEarnings)
                        }).catch(() => {})
                    ]);
                }
            } catch (err) {
                console.warn("Reversal error, continuing deletion:", err);
            }
            
            await deleteDoc(saleRef);
            return true;
        }
        return false;
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'sales/' + saleId);
        return false;
    }
};

export const addProductRating = async (saleId: string, rating: number, comment: string) => {
    if (!db) return;
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);
        
        if (saleDoc.exists()) {
            const saleData = saleDoc.data() as AffiliateSale;
            const productId = saleData.productId;
            const userId = saleData.buyerId;
            
            // 1. Atualizar a venda
            await updateDoc(saleRef, { isRated: true, rating, ratingComment: comment });
            
            // 2. Adicionar avaliação ao produto (se o produto existir)
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const product = productDoc.data() as Product;
                const newRatingObj: ProductRating = {
                    id: generateUUID(),
                    saleId,
                    userId,
                    rating,
                    comment,
                    timestamp: Date.now()
                };
                
                const currentRatings = product.ratings || [];
                const newRatings = [...currentRatings, newRatingObj];
                const newCount = newRatings.length;
                const newAvg = newRatings.reduce((acc, r) => acc + r.rating, 0) / newCount;
                
                await updateDoc(productRef, {
                    ratings: newRatings,
                    averageRating: newAvg,
                    ratingCount: newCount
                });
            }
        }
    } catch (error) {
        console.error("Erro ao adicionar avaliação:", error);
        throw error; // Re-throw to be caught by UI
    }
};

export const createProduct = async (p: Product) => {
    if (!db) return;

    // Sentinela AI Check
    const security = await checkContentSecurity(`${p.name} ${p.description}`, 'product');
    if (!security.allowed) {
        if (security.isFraud) {
            // Se tentar criar produto fraudulento, bloqueia o vendedor
            const storeDoc = await getDoc(doc(db, 'stores', p.storeId));
            if (storeDoc.exists()) {
                const sellerId = storeDoc.data().professorId;
                await updateDoc(doc(db, 'profiles', sellerId), { isFrozen: true });
            }
        }
        throw new Error(`SENTINEL_BLOCK: ${security.reason}`);
    }

    await setDoc(doc(db, 'products', p.id), {
        ...p,
        soldCount: 0,
        timestamp: Date.now()
    });
};

export const updateProduct = async (id: string, p: Partial<Product>) => {
    if (!db) return;
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
        ...p,
        updatedAt: Date.now()
    });
};

export const getAffiliateSales = async (filters?: { affiliateUserId?: string, storeId?: string, buyerId?: string, sellerId?: string }) => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        let q: any = collection(db, 'sales');
        
        if (filters?.affiliateUserId) {
            q = query(q, where('affiliateUserId', '==', filters.affiliateUserId));
        } else if (filters?.sellerId) {
            q = query(q, where('sellerId', '==', filters.sellerId));
        } else if (filters?.storeId) {
            q = query(q, where('storeId', '==', filters.storeId));
        } else if (filters?.buyerId) {
            q = query(q, where('buyerId', '==', filters.buyerId));
        }
        
        let snap: QuerySnapshot<DocumentData>;
        try {
            snap = await getDocs(q);
        } catch (initialError: any) {
            if (initialError.message && (initialError.message.includes('offline') || initialError.message.includes('permissions'))) {
                console.warn("⚠️ Problema de permissão ou offline. Tentando getDocsFromServer...");
                snap = await getDocsFromServer(q);
            } else {
                throw initialError;
            }
        }
        return snap.docs.map(d => ({ ...d.data() as any, id: d.id } as AffiliateSale));
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'sales');
        return [];
    }
};

export const addStory = async (uid: string, storyData: Partial<Story>, userName: string, userProfilePic: string) => {
    if (!db) return;
    const id = generateUUID();
    await setDoc(doc(db, 'stories', id), { 
        ...storyData, 
        userId: uid, 
        userName,
        userProfilePic,
        id, 
        timestamp: Date.now(),
        views: []
    });
};

export const markStoryAsViewed = async (storyId: string, userId: string) => {
    if (!db) return;
    const ref = doc(db, 'stories', storyId);
    try {
        await updateDoc(ref, { views: arrayUnion(userId) });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `stories/${storyId}`);
    }
};

export const indicatePostToUser = async (pid: string, from: string, to: string) => {
    if (!db) return false;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const indicated = d.data().indicatedUserIds || [];
        if (!indicated.includes(to)) {
            await updateDoc(ref, { indicatedUserIds: [...indicated, to] });
            return true;
        }
    }
    return false;
};

export const deleteComment = async (pid: string, cid: string) => {
    if (!db) return;
    const ref = doc(db, 'posts', pid);
    const d = await getDoc(ref);
    if(d.exists()){
        const comments = (d.data().comments || []).filter((c:any) => c.id !== cid);
        await updateDoc(ref, { comments });
    }
};

export const getPlatformRevenue = async () => {
    if (!db) return 0;
    try {
        const snap = await getDocs(collection(db, 'transactions'));
        return snap.docs.reduce((acc, d) => acc + (d.data().amount || 0), 0);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'transactions (revenue)');
        return 0;
    }
};

export const getTransactions = async (uid?: string, currentAdmin?: User, limitCount?: number, startDoc?: QueryDocumentSnapshot): Promise<PaginatedResult<Transaction>> => {
    if (!isFirebaseConfigured || !db) return { items: [], lastDoc: null, hasMore: false };
    try {
        let q: Query = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
        
        if (uid) {
            q = query(q, where('userId', '==', uid));
        } else if (currentAdmin && !currentAdmin.isAdmin) {
            q = query(q, where('userId', '==', currentAdmin.id));
        }
        
        if (startDoc) {
            q = query(q, startAfter(startDoc));
        }
        
        if (limitCount) {
            q = query(q, limit(limitCount + 1));
        }

        const snap = await getDocs(q);
        let docs = snap.docs;
        const hasMore = limitCount ? docs.length > limitCount : false;
        if (hasMore) {
            docs = docs.slice(0, limitCount);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const items = docs.map(d => ({ ...(d.data() as any), id: d.id } as Transaction));

        return {
            items,
            lastDoc: lastDoc as QueryDocumentSnapshot | null,
            hasMore
        };
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        return { items: [], lastDoc: null, hasMore: false };
    }
};

export const getReports = async (limitCount?: number, startDoc?: QueryDocumentSnapshot): Promise<PaginatedResult<ContentReport>> => {
    if (!db) return { items: [], lastDoc: null, hasMore: false };
    try {
        let q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));

        if (startDoc) {
            q = query(q, startAfter(startDoc));
        }

        if (limitCount) {
            q = query(q, limit(limitCount + 1));
        }

        const snap = await getDocs(q);
        let docs = snap.docs;
        const hasMore = limitCount ? docs.length > limitCount : false;
        if (hasMore) {
            docs = docs.slice(0, limitCount);
        }

        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const items = docs.map(d => ({ ...(d.data() as any), id: d.id } as ContentReport));

        return {
            items,
            lastDoc: lastDoc as QueryDocumentSnapshot | null,
            hasMore
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'reports');
        return { items: [], lastDoc: null, hasMore: false };
    }
};

export const adminUpdateUser = async (u: User) => {
    await updateUser(u);
    if (db) {
        try {
            if (u.isAdmin) {
                await setDoc(doc(db, 'admins', u.id), {
                    email: u.email,
                    timestamp: Date.now()
                }, { merge: true });
            } else {
                await deleteDoc(doc(db, 'admins', u.id));
            }
        } catch (err) {
            console.warn("[STORAGE] Erro ao sincronizar status de admin:", err);
        }
    }
};
export const adminDeletePost = async (id: string) => await deletePost(id);
export const adminProcessReport = async (id: string, status: string, adminId: string) => {
    if (!db) return;
    await updateDoc(doc(db, 'reports', id), { status, resolvedBy: adminId });
};

export const updateGlobalSettings = async (s: GlobalSettings) => {
    if (!db) return;
    try {
        await setDoc(doc(db, 'settings', 'global'), s, { merge: true });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
};

export const handleWalletTransaction = async (uid: string, amt: number, type: string) => {
    if (!db) return false;
    const u = await findUserById(uid);
    if(u) {
        if (u.isFrozen) {
            throw new Error("SENTINEL_BLOCK: Sua conta está bloqueada para transações financeiras devido a atividades suspeitas monitoradas pelo Sentinela.");
        }
        if (type === 'withdraw' && u.balance! < amt) return false;
        const diff = type === 'deposit' ? amt : -amt;
        const updateData: any = { balance: increment(diff) };
        if (type === 'withdraw') {
            updateData.totalWithdrawn = increment(amt);
        }
        await updateDoc(doc(db, 'profiles', uid), updateData);
        await updateDoc(doc(db, 'public_profiles', uid), { balance: increment(diff) });
        
        const txId = generateUUID();
        await setDoc(doc(db, 'transactions', txId), {
            id: txId,
            userId: uid,
            amount: diff,
            type: type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });
        return true;
    }
    return false;
};

export const createTransaction = async (transaction: Transaction) => {
  if (!db) return;
  try {
    const txId = transaction.id || generateUUID();
    const finalTx = { ...transaction, id: txId, timestamp: transaction.timestamp || Date.now() };
    await setDoc(doc(db, 'transactions', txId), finalTx);
    
    if (transaction.amount !== 0) {
      const profileRef = doc(db, 'profiles', transaction.userId);
      const publicRef = doc(db, 'public_profiles', transaction.userId);
      await updateDoc(profileRef, { balance: increment(transaction.amount) });
      await updateDoc(publicRef, { balance: increment(transaction.amount) });
    }
    return finalTx;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'transactions');
  }
};

export const boostPost = async (pid: string, uid: string, days: number, amount: number) => {
    if (!db) return false;
    await checkUserFrozen(uid);
    
    // Check user balance
    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    
    if (balance < amount) return false;
    
    // Deduct balance
    const newBalance = balance - amount;
    await updateDoc(userRef, { balance: newBalance });
    await updateDoc(doc(db, 'public_profiles', uid), { balance: newBalance });
    
    // Boost post with bid
    await updateDoc(doc(db, 'posts', pid), { 
      isBoosted: true, 
      boostExpires: Date.now() + (days * 86400000),
      boostBid: amount
    });
    
    // Create transaction log
    const txId = generateUUID();
    await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId: uid,
        amount: -amount,
        type: 'PLATFORM_FEE',
        description: `Boost de publicação (Lance: $${amount.toFixed(2)}) - ${days} dias`,
        status: 'COMPLETED',
        timestamp: Date.now()
    });

    return true;
};

export const processVerificationPayment = async (uid: string) => {
    if (!db) return false;
    const settings = await getGlobalSettings();
    const fee = settings.verificationFee || 0;
    
    if (fee <= 0) return true; // No fee set

    const userRef = doc(db, 'profiles', uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const balance = userData.balance || 0;
    
    if (balance < fee) return false;
    
    // Deduct balance
    const newBalance = balance - fee;
    await updateDoc(userRef, { balance: newBalance });
    await updateDoc(doc(db, 'public_profiles', uid), { balance: newBalance });
    
    // Add transaction
    const txId = generateUUID();
    await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        userId: uid,
        amount: -fee,
        type: 'PLATFORM_FEE',
        description: `Taxa de Verificação de Identidade (Selo Azul)`,
        status: 'COMPLETED',
        timestamp: Date.now()
    });
    
    return true;
};

export const createGroup = async (name: string, members: string[], adminId: string, description?: string, theme?: GroupTheme, imageFile?: File, isPublic?: boolean) => {
    if (!db) return false;
    await checkUserFrozen(adminId);
    
    // Check for group creation fee
    try {
        const settings = await getGlobalSettings();
        const fee = settings.groupCreationFee || 0;
        
        if (fee > 0) {
            const userRef = doc(db, 'profiles', adminId);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) return false;
            
            const userData = userDoc.data();
            const balance = userData.balance || 0;
            
            if (balance < fee) return false;
            
            // Deduct balance
            const newBalance = balance - fee;
            await updateDoc(userRef, { balance: newBalance });
            await updateDoc(doc(db, 'public_profiles', adminId), { balance: newBalance });
            
            // Add transaction
            const txId = generateUUID();
            await setDoc(doc(db, 'transactions', txId), {
                id: txId,
                userId: adminId,
                amount: -fee,
                type: 'PLATFORM_FEE',
                description: `Criação de Comunidade: ${name}`,
                status: 'COMPLETED',
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error("Error checking group fee:", e);
    }

    const id = generateUUID();
    let image = '';
    if (imageFile) image = await uploadFile(imageFile, 'groups');
    await setDoc(doc(db, 'chats', id), {
        id,
        type: ChatType.GROUP,
        participants: [...members, adminId],
        messages: [],
        groupName: name,
        groupImage: image,
        adminId,
        isPublic,
        description,
        theme: theme || 'blue',
        timestamp: Date.now()
    });
    return true;
};

export const getSupportTickets = async (uid: string) => {
    if (!db) return [];
    return (await getDocs(query(collection(db, 'tickets'), where('userId', '==', uid)))).docs.map(d => ({ ...d.data(), id: d.id } as SupportTicket));
};

export const createSupportTicket = async (data: any, desc: string, url?: string, type?: string) => {
    if (!db) return;
    const id = generateUUID();
    const msg: SupportMessage = { id: generateUUID(), senderId: data.userId, text: desc, attachmentUrl: url, attachmentType: type as any, timestamp: Date.now() };
    await setDoc(doc(db, 'tickets', id), {
        ...data,
        id,
        status: 'OPEN',
        assignedAdminId: '',
        messages: [msg],
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
};

export const addSupportMessage = async (tid: string, msg: any) => {
    if (!db) return;
    const ref = doc(db, 'tickets', tid);
    const d = await getDoc(ref);
    if(d.exists()){
        const data = d.data() as SupportTicket;
        const m = { ...msg, id: generateUUID(), timestamp: Date.now() };
        
        const updateData: any = { 
            messages: [...(data.messages || []), m], 
            updatedAt: Date.now() 
        };

        // If sender is admin and ticket is not assigned, assign it
        if (msg.senderId === 'SUPPORT' && !data.assignedAdminId) {
            if (auth?.currentUser) {
                updateData.assignedAdminId = auth.currentUser.uid;
            }
        }

        await updateDoc(ref, updateData);
    }
};

export const claimSupportTicket = async (tid: string, adminId: string) => {
    if (!db) return;
    const ref = doc(db, 'tickets', tid);
    try {
        await updateDoc(ref, {
            assignedAdminId: adminId,
            updatedAt: Date.now()
        });
    } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'tickets/' + tid);
    }
};

export const getAdminSupportTickets = async (adminId?: string) => {
    if (!db) return [];
    try {
        let q: any = collection(db, 'tickets');
        
        // If it's a super admin, we don't necessarily need to filter (unless they want to)
        // For standard admins, we filter by unassigned or assigned to them
        const isSuper = auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com' || auth?.currentUser?.email === 'admin@facephone.com';
        
        if (adminId && !isSuper) {
             // Filter unassigned ('') or assigned to me
             q = query(q, where('assignedAdminId', 'in', ['', adminId]));
        }
        
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as SupportTicket));
    } catch (err) {
        console.error("[STORAGE] Error fetching admin tickets (likely security restriction):", err);
        return [];
    }
};

export const subscribeToSupportTickets = (userId: string, callback: (tickets: SupportTicket[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'tickets'), where('userId', '==', userId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ ...d.data(), id: d.id } as SupportTicket)));
    }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tickets');
    });
};

export const subscribeToAdminSupportTickets = (adminId: string, callback: (tickets: SupportTicket[]) => void) => {
    if (!db) return () => {};
    
    let q: any = collection(db, 'tickets');
    const isSuper = auth?.currentUser?.email === 'ac926815124@gmail.com' || auth?.currentUser?.email === 'alfaajmc@gmail.com' || auth?.currentUser?.email === 'admin@facephone.com';
    
    if (!isSuper) {
        q = query(q, where('assignedAdminId', 'in', ['', adminId]));
    }

    return onSnapshot(q, (snap: any) => {
        callback(snap.docs.map((d: any) => ({ ...(d.data() as any), id: d.id } as SupportTicket)));
    }, (err: any) => {
        handleFirestoreError(err, OperationType.LIST, 'tickets');
    });
};

export const resolveSupportTicket = async (tid: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'tickets', tid), {
            status: 'RESOLVED',
            updatedAt: Date.now()
        });
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'tickets/' + tid);
    }
};

export const getSystemLogs = async (): Promise<SystemLog[]> => {
    if (!isFirebaseConfigured || !db) return [];
    try {
        const snap = await getDocs(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100)));
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemLog));
    } catch (error) {
        console.warn("[STORAGE] Error fetching system logs:", error);
        return [];
    }
};

export const updateUserVerificationDocs = async (userId: string, docs: User['idVerificationDocs'], extraData?: Partial<User>) => {
    if (!db) return;
    try {
        const updateObj: any = { 
            idVerificationDocs: docs,
            idVerificationStatus: 'PENDING'
        };
        if (extraData) {
            Object.assign(updateObj, extraData);
        }
        await updateDoc(doc(db, 'profiles', userId), updateObj);
        await updateDoc(doc(db, 'public_profiles', userId), updateObj);
    } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'profiles/' + userId);
    }
};

export const updateUserVerificationStatus = async (userId: string, status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED') => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'profiles', userId), { idVerificationStatus: status });
        await updateDoc(doc(db, 'public_profiles', userId), { idVerificationStatus: status });
    } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'profiles/' + userId);
    }
};

export const findProductById = async (productId: string): Promise<Product | undefined> => {
    // Check local cache first
    const localProducts = JSON.parse(localStorage.getItem('cyber_product_cache') || '{}');
    if (localProducts[productId]) {
        return localProducts[productId];
    }

    if (!db) return undefined;
    try {
        const docSnap = await getDoc(doc(db, 'products', productId));
        if (docSnap.exists()) {
            const p = { ...docSnap.data(), id: docSnap.id } as Product;
            // Update cache
            localProducts[productId] = p;
            localStorage.setItem('cyber_product_cache', safeJsonStringify(localProducts));
            return p;
        }
        return undefined;
    } catch (err) {
        return undefined;
    }
};

export const getSalesByStoreId = async (storeId: string): Promise<AffiliateSale[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, 'sales'), where('storeId', '==', storeId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as AffiliateSale));
    } catch (err) {
        return [];
    }
};

