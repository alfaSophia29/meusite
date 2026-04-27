
export type Page = 'auth' | 'feed' | 'profile' | 'chat' | 'ads' | 'live' | 'store' | 'manage-store' | 'reels-page' | 'search-results' | 'notifications' | 'settings' | 'admin' | 'events' | 'purchases' | 'affiliates' | 'create-group' | 'support' | 'monetization' | 'terms' | 'privacy' | 'saved' | 'blocked-users';

export enum ChatType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP'
}

export type GroupTheme = 
  | 'blue' 
  | 'green' 
  | 'black' 
  | 'orange' 
  | 'purple' 
  | 'red' 
  | 'teal' 
  | 'pink' 
  | 'indigo' 
  | 'cyan';

export interface ChatConversation {
  id: string;
  type: ChatType;
  participants: string[]; // IDs dos usuários
  messages: Message[];
  groupName?: string;
  groupImage?: string;
  adminId?: string;
  isPublic?: boolean; 
  description?: string;
  theme?: GroupTheme; // NOVO: Tema visual do grupo
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; 
  groupId?: string;    
  timestamp: number;
  text?: string;
  // Campos de Mídia e Arquivos
  imageUrl?: string; // Mantido para compatibilidade, mas preferir fileUrl
  fileUrl?: string;
  fileType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  fileName?: string;
  
  isDeleted?: boolean;
  isEdited?: boolean;
  isRead?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'document'; // Tipo do reply
  };
  reactions?: Record<string, string[]>; // emoji -> userIds
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  CHAT_FEE = 'CHAT_FEE',
  BOOST = 'BOOST',
  DROPSHIPPING_COST = 'DROPSHIPPING_COST',
  DONATION = 'DONATION'
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface SystemLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  details: string;
  timestamp: number;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetId: string; 
  targetType: 'POST' | 'COMMENT' | 'USER';
  reason: string;
  details: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  timestamp: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentId: string;
  birthDate: number; 
  gender?: 'Masculino' | 'Feminino' | 'Personalizado' | null;
  profilePicture?: string;
  coverPhoto?: string;
  followedUsers: string[]; 
  followers: string[];     
  balance?: number;
  bio?: string;
  storeId?: string | null;
  isAdmin?: boolean;
  isVerified?: boolean;
  idVerificationStatus?: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  idVerificationDocs?: {
    frontUrl?: string;
    backUrl?: string;
    selfieUrl?: string;
    rejectionReason?: string;
    submittedAt?: number;
    expiresAt?: number;
  };
  userType?: 'STANDARD' | 'CREATOR';
  isSuspended?: boolean;
  verificationFileUrl?: string;
  blockedUserIds?: string[];
  // Status Online
  isOnline?: boolean;
  lastSeen?: number;
  // Monetização
  isMonetized?: boolean;
  monetizationStatus?: 'INELIGIBLE' | 'ELIGIBLE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  monetizationGoals?: {
    followersGoal: number;
    watchHoursGoal: number;
    shortsViewsGoal: number;
    currentFollowers: number;
    currentWatchHours: number;
    currentShortsViews: number;
    termsAccepted?: boolean;
    verificationStep?: boolean;
  };
  address?: ShippingAddress;
}

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LIVE = 'LIVE',
  REEL = 'REEL',
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  profilePic?: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>; // emoji -> userIds
  replies?: Comment[];
  isAnonymous?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  authorName: string;
  authorProfilePic?: string;
  type: PostType;
  timestamp: number;
  content?: string;
  imageUrl?: string;
  groupId?: string; 
  groupName?: string; 
  fontFamily?: string;
  textColor?: string;
  fontSize?: string;
  backgroundColor?: string;
  isBoosted?: boolean;
  boostExpires?: number;
  boostBid?: number; // Valor do lance para o leilão de visibilidade
  disableComments?: boolean; // NOVO: Controle do professor
  likes: string[];
  comments: Comment[];
  shares: string[];
  saves: string[];
  isPinned?: boolean;
  indicatedUserIds?: string[];
  reactions?: Record<string, string[]>;
  tags?: string[];
  isAnonymous?: boolean;
  reel?: {
    videoUrl: string;
    coverImageUrl?: string; // NOVO: Capa do vídeo
    description: string;
    audioTrackId?: string;
    aiEffectPrompt?: string;
    filter?: string;
  };
  liveStream?: {
    title: string;
    description: string;
    status?: 'LIVE' | 'ENDED'; // Status da transmissão
    recordingUrl?: string;     // URL da gravação se for Free
  };
  // Dados persistentes da Live
  liveChat?: Comment[];
  liveViewerCount?: number;
  liveHeartCount?: number;
  views?: number; // NOVO: Contador de visualizações para Reels
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL_COURSE = 'DIGITAL_COURSE',
  DIGITAL_EBOOK = 'DIGITAL_EBOOK',
  DIGITAL_OTHER = 'DIGITAL_OTHER',
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  affiliateCommissionRate: number;
  type: ProductType;
  ratings: ProductRating[];
  averageRating: number;
  ratingCount: number;
  digitalContentUrl?: string;
  digitalDownloadInstructions?: string;
  colors?: string[];
  isDropshipping?: boolean;
  externalProviderId?: string;
  // Dados de Preço e Promoção
  originalPrice?: number;
  discountPercentage?: number;
  hasFreeShipping?: boolean;
  shippingFee?: number;
  
  // Posicionamento e Bidding (Leilão)
  positioning?: 'STANDARD' | 'TOP_SEARCH' | 'MAIN_BANNER';
  bidAmount?: number; // Valor pago para aparecer no topo/banner
  
  // Detalhes Específicos
  courseDetails?: {
    lessonsCount: number;
    totalHours: number;
    hasCertificate: boolean;
    modules: string[];
  };
  physicalDetails?: {
    weight?: number;
    dimensions?: string;
    stock: number;
  };
  
  originalProductId?: string; // ID do produto original no sistema
  isAvailableForDropshipping?: boolean; // Se o dono permite que outros façam dropshipping
  dropshippingPrice?: number; // Preço base para dropshippers
}

export interface ProductRating {
  id: string;
  saleId: string;
  userId: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Store {
  id: string;
  professorId: string;
  name: string;
  description: string;
  productIds: string[];
  brandColor?: string;
}

export enum OrderStatus {
  WAITLIST = 'WAITLIST',
  PROCESSING_SUPPLIER = 'PROCESSING_SUPPLIER',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED'
}

export interface AffiliateSale {
  id: string;
  productId: string;
  buyerId: string;
  affiliateUserId: string;
  storeId: string;
  commissionEarned: number;
  saleAmount: number;
  timestamp: number;
  status: OrderStatus;
  isRated?: boolean;
  shippingAddress?: ShippingAddress;
  digitalContentUrl?: string;
  digitalDownloadInstructions?: string;
  isDropshipping?: boolean;
  supplierCost?: number;
  supplierOrderId?: string;
  trackingCode?: string;
}

export interface ShippingAddress {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface AdCampaign {
  id: string;
  professorId: string;
  title: string;
  description: string;
  targetAudience: string;
  budget: number;
  isActive: boolean;
  imageUrl?: string;
  linkUrl?: string;
  ctaText?: string;
  timestamp: number;
  minAge?: number;
  maxAge?: number;
  locations?: string[]; // Locais persistentes (Ex: "BR: São Paulo")
}

export interface CyberEvent {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description?: string;
  dateTime: number;
  endDateTime?: number;
  type: 'ONLINE' | 'PRESENTIAL';
  attendees: string[];
  imageUrl: string;
  mediaType?: 'image' | 'video'; // NOVO CAMPO: Suporte a vídeo
  location?: string;
  isPublic?: boolean;
}

export interface GlobalSettings {
  platformTax: number;
  minWithdrawal: number;
  maintenanceMode: boolean;
  boostFee: number;
  boostMinBid?: number; // Lance mínimo inicial
  adMinBudget?: number;
  adReachCost?: number;
  verificationFee?: number;
  groupCreationFee?: number;
  storeCreationFee?: number;
  positioningMinBid?: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
}

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
  AFFILIATE_SALE = 'AFFILIATE_SALE',
  REACTION = 'REACTION',
  MESSAGE = 'MESSAGE',
  NEW_POST = 'NEW_POST',
  INDICATION = 'INDICATION',
  GROUP_POST = 'GROUP_POST'
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  timestamp: number;
  postId?: string;
  saleId?: string;
  isRead: boolean;
  groupName?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userProfilePic: string;
  imageUrl?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  filter?: string;
  timestamp: number;
  views: string[];
}

export interface GroupedStory {
  userId: string;
  userName: string;
  userProfilePic: string;
  items: Story[];
}

export interface PaymentCard {
  id: string;
  userId: string;
  cardNumber: string;
  expiryDate: string;
  cardHolderName: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: 'TECHNICAL' | 'BILLING' | 'ABUSE' | 'OTHER';
  status: 'OPEN' | 'RESOLVED';
  messages: SupportMessage[];
  createdAt: number;
  updatedAt: number;
  assignedAdminId?: string;
}

export interface SupportMessage {
  id: string;
  senderId: string; // 'SUPPORT' or UserID
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video';
  timestamp: number;
}
