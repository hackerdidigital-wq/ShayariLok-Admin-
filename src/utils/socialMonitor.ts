import type {
  AppUserProfile,
  ChatMessageItem,
  ChatRoomItem,
  SocialEdgeItem,
} from '../types/config';

export interface SocialOverviewStats {
  totalUsers: number;
  onlineUsers: number;
  blockedUsers: number;
  totalFollows: number;
  totalLikes: number;
  activeChatRooms: number;
  flaggedRooms: number;
}

export interface UserRelationshipSummary {
  followers: SocialEdgeItem[];
  following: SocialEdgeItem[];
  likedBy: SocialEdgeItem[];
  likedTargets: SocialEdgeItem[];
}

export const DEMO_APP_USERS: AppUserProfile[] = [
  {
    uid: 'usr_aarav_101',
    displayName: 'Aarav Sharma',
    username: 'aarav.shayari',
    city: 'Jaipur',
    address: 'Malviya Nagar, Sector 4, Jaipur (RJ)',
    bio: 'दिल की बातों को अल्फ़ाज़ में पिरोने वाला लेखक ✍️',
    isOnline: true,
    isBlocked: false,
    blockReason: '',
    followersCount: 2,
    followingCount: 1,
    likesReceivedCount: 2,
    createdAt: '2026-11-10T09:15:00Z',
    updatedAt: '2026-11-14T05:10:00Z',
  },
  {
    uid: 'usr_priya_102',
    displayName: 'Priya Verma',
    username: 'priya_writes',
    city: 'Lucknow',
    address: 'Gomti Nagar Extension, Lucknow (UP)',
    bio: 'सवेरे के सुविचार और ग़ज़ल की शौक़ीन 🌸',
    isOnline: true,
    isBlocked: false,
    blockReason: '',
    followersCount: 2,
    followingCount: 2,
    likesReceivedCount: 1,
    createdAt: '2026-11-11T11:20:00Z',
    updatedAt: '2026-11-14T05:12:00Z',
  },
  {
    uid: 'usr_rohan_103',
    displayName: 'Rohan Chauhan',
    username: 'rohan_poetry',
    city: 'Indore',
    address: 'Vijay Nagar Square, Indore (MP)',
    bio: 'हौसला और सफ़र पर मोटिवेशनल शायरी',
    isOnline: false,
    isBlocked: false,
    blockReason: '',
    followersCount: 1,
    followingCount: 1,
    likesReceivedCount: 1,
    createdAt: '2026-11-12T14:00:00Z',
    updatedAt: '2026-11-14T04:45:00Z',
  },
  {
    uid: 'usr_spam_104',
    displayName: 'Vikram PromoBot',
    username: 'vikram_deals99',
    city: 'Delhi',
    address: 'Karol Bagh West, New Delhi (DL)',
    bio: 'Fast promo links & external offers',
    isOnline: true,
    isBlocked: false,
    blockReason: '',
    followersCount: 0,
    followingCount: 1,
    likesReceivedCount: 0,
    createdAt: '2026-11-13T18:30:00Z',
    updatedAt: '2026-11-14T05:14:00Z',
  },
];

export const DEMO_SOCIAL_EDGES: SocialEdgeItem[] = [
  {
    id: 'edge_follow_101_102',
    actorId: 'usr_aarav_101',
    targetId: 'usr_priya_102',
    actorName: 'Aarav Sharma',
    targetName: 'Priya Verma',
    type: 'follow',
    createdAt: '2026-11-13T10:00:00Z',
  },
  {
    id: 'edge_follow_102_101',
    actorId: 'usr_priya_102',
    targetId: 'usr_aarav_101',
    actorName: 'Priya Verma',
    targetName: 'Aarav Sharma',
    type: 'follow',
    createdAt: '2026-11-13T10:15:00Z',
  },
  {
    id: 'edge_follow_103_101',
    actorId: 'usr_rohan_103',
    targetId: 'usr_aarav_101',
    actorName: 'Rohan Chauhan',
    targetName: 'Aarav Sharma',
    type: 'follow',
    createdAt: '2026-11-13T12:20:00Z',
  },
  {
    id: 'edge_follow_102_103',
    actorId: 'usr_priya_102',
    targetId: 'usr_rohan_103',
    actorName: 'Priya Verma',
    targetName: 'Rohan Chauhan',
    type: 'follow',
    createdAt: '2026-11-13T15:40:00Z',
  },
  {
    id: 'edge_like_102_101',
    actorId: 'usr_priya_102',
    targetId: 'usr_aarav_101',
    actorName: 'Priya Verma',
    targetName: 'Aarav Sharma',
    type: 'like',
    createdAt: '2026-11-14T04:50:00Z',
  },
  {
    id: 'edge_like_103_101',
    actorId: 'usr_rohan_103',
    targetId: 'usr_aarav_101',
    actorName: 'Rohan Chauhan',
    targetName: 'Aarav Sharma',
    type: 'like',
    createdAt: '2026-11-14T04:58:00Z',
  },
  {
    id: 'edge_like_101_102',
    actorId: 'usr_aarav_101',
    targetId: 'usr_priya_102',
    actorName: 'Aarav Sharma',
    targetName: 'Priya Verma',
    type: 'like',
    createdAt: '2026-11-14T05:05:00Z',
  },
  {
    id: 'edge_like_101_103',
    actorId: 'usr_aarav_101',
    targetId: 'usr_rohan_103',
    actorName: 'Aarav Sharma',
    targetName: 'Rohan Chauhan',
    type: 'like',
    createdAt: '2026-11-14T05:07:00Z',
  },
];

export const DEMO_CHAT_ROOMS: ChatRoomItem[] = [
  {
    id: 'room_101_102',
    participantIds: ['usr_aarav_101', 'usr_priya_102'],
    participantNames: ['Aarav Sharma', 'Priya Verma'],
    lastMessage: 'जी बिल्कुल, शाम को नई हिंदी ग़ज़ल लिखकर भेजता हूँ!',
    lastSenderId: 'usr_aarav_101',
    messageCount: 3,
    flaggedSpam: false,
    updatedAt: '2026-11-14T05:12:00Z',
  },
  {
    id: 'room_102_104',
    participantIds: ['usr_priya_102', 'usr_spam_104'],
    participantNames: ['Priya Verma', 'Vikram PromoBot'],
    lastMessage: 'Click this external link now to win cash bonus http://bit.ly/spam-promo',
    lastSenderId: 'usr_spam_104',
    messageCount: 2,
    flaggedSpam: true,
    updatedAt: '2026-11-14T05:14:00Z',
  },
];

export const DEMO_CHAT_MESSAGES: Record<string, ChatMessageItem[]> = {
  room_101_102: [
    {
      id: 'msg_1',
      roomId: 'room_101_102',
      senderId: 'usr_priya_102',
      senderName: 'Priya Verma',
      receiverId: 'usr_aarav_101',
      text: 'नमस्ते आरव जी, आपकी जयपुर वाली नई शायरी बहुत पसंद आई!',
      isFlagged: false,
      createdAt: '2026-11-14T05:08:00Z',
    },
    {
      id: 'msg_2',
      roomId: 'room_101_102',
      senderId: 'usr_aarav_101',
      senderName: 'Aarav Sharma',
      receiverId: 'usr_priya_102',
      text: 'बहुत-बहुत धन्यवाद प्रिया जी! क्या आप भी आज सुविचार पोस्ट करेंगी?',
      isFlagged: false,
      createdAt: '2026-11-14T05:10:00Z',
    },
    {
      id: 'msg_3',
      roomId: 'room_101_102',
      senderId: 'usr_aarav_101',
      senderName: 'Aarav Sharma',
      receiverId: 'usr_priya_102',
      text: 'जी बिल्कुल, शाम को नई हिंदी ग़ज़ल लिखकर भेजता हूँ!',
      isFlagged: false,
      createdAt: '2026-11-14T05:12:00Z',
    },
  ],
  room_102_104: [
    {
      id: 'msg_s1',
      roomId: 'room_102_104',
      senderId: 'usr_spam_104',
      senderName: 'Vikram PromoBot',
      receiverId: 'usr_priya_102',
      text: 'Hello, join my external channel for free recharge offers.',
      isFlagged: false,
      createdAt: '2026-11-14T05:13:00Z',
    },
    {
      id: 'msg_s2',
      roomId: 'room_102_104',
      senderId: 'usr_spam_104',
      senderName: 'Vikram PromoBot',
      receiverId: 'usr_priya_102',
      text: 'Click this external link now to win cash bonus http://bit.ly/spam-promo',
      isFlagged: true,
      createdAt: '2026-11-14T05:14:00Z',
    },
  ],
};

export function computeSocialOverview(
  users: AppUserProfile[],
  edges: SocialEdgeItem[],
  rooms: ChatRoomItem[]
): SocialOverviewStats {
  let onlineUsers = 0;
  let blockedUsers = 0;
  for (const u of users) {
    if (u.isOnline) onlineUsers += 1;
    if (u.isBlocked) blockedUsers += 1;
  }

  let totalFollows = 0;
  let totalLikes = 0;
  for (const edge of edges) {
    if (edge.type === 'follow') totalFollows += 1;
    if (edge.type === 'like') totalLikes += 1;
  }

  let flaggedRooms = 0;
  for (const room of rooms) {
    if (room.flaggedSpam) flaggedRooms += 1;
  }

  return {
    totalUsers: users.length,
    onlineUsers,
    blockedUsers,
    totalFollows,
    totalLikes,
    activeChatRooms: rooms.length,
    flaggedRooms,
  };
}

export function filterAppUsers(
  users: AppUserProfile[],
  query: string,
  filterMode: 'all' | 'online' | 'blocked'
): AppUserProfile[] {
  const q = query.trim().toLowerCase();
  return users.filter((user) => {
    if (filterMode === 'online' && !user.isOnline) return false;
    if (filterMode === 'blocked' && !user.isBlocked) return false;
    if (!q) return true;
    return (
      user.uid.toLowerCase().includes(q) ||
      user.displayName.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.city.toLowerCase().includes(q) ||
      user.address.toLowerCase().includes(q) ||
      user.bio.toLowerCase().includes(q)
    );
  });
}

export function filterChatRooms(
  rooms: ChatRoomItem[],
  query: string,
  onlyFlagged: boolean
): ChatRoomItem[] {
  const q = query.trim().toLowerCase();
  return rooms.filter((room) => {
    if (onlyFlagged && !room.flaggedSpam) return false;
    if (!q) return true;
    return (
      room.id.toLowerCase().includes(q) ||
      room.participantNames.some((n) => n.toLowerCase().includes(q)) ||
      room.participantIds.some((id) => id.toLowerCase().includes(q)) ||
      room.lastMessage.toLowerCase().includes(q)
    );
  });
}

export function getUserRelationships(
  uid: string,
  edges: SocialEdgeItem[]
): UserRelationshipSummary {
  const followers: SocialEdgeItem[] = [];
  const following: SocialEdgeItem[] = [];
  const likedBy: SocialEdgeItem[] = [];
  const likedTargets: SocialEdgeItem[] = [];

  for (const edge of edges) {
    if (edge.type === 'follow') {
      if (edge.targetId === uid) followers.push(edge);
      if (edge.actorId === uid) following.push(edge);
    } else if (edge.type === 'like') {
      if (edge.targetId === uid) likedBy.push(edge);
      if (edge.actorId === uid) likedTargets.push(edge);
    }
  }

  return { followers, following, likedBy, likedTargets };
}

export function buildAndroidSocialFirestoreEndpoints(config: {
  projectId: string;
  firestoreDatabaseId: string;
}): {
  baseDocumentApi: string;
  appUsersPath: string;
  socialEdgesPath: string;
  chatRoomsPath: string;
  messagesSubcollectionTemplate: string;
} {
  const project = config.projectId.trim() || 'your-firebase-project';
  const database = config.firestoreDatabaseId.trim() || '(default)';
  const baseDocumentApi = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents`;
  return {
    baseDocumentApi,
    appUsersPath: `${baseDocumentApi}/appUsers`,
    socialEdgesPath: `${baseDocumentApi}/socialEdges`,
    chatRoomsPath: `${baseDocumentApi}/chatRooms`,
    messagesSubcollectionTemplate: `${baseDocumentApi}/chatRooms/{roomId}/messages`,
  };
}

export function generateAndroidSocialIntegrationCode(config: {
  projectId: string;
  firestoreDatabaseId: string;
  apiKey: string;
  appId: string;
}): string {
  const dbId = config.firestoreDatabaseId.trim() || '(default)';
  return `// =========================================================================
// Shayari Lok — Android Social & Real-Time Chat Integration (Firebase SDK)
// Project ID: ${config.projectId}
// Firestore Database ID: ${dbId}
// =========================================================================

// 1) Gradle Dependencies (app/build.gradle.kts)
// implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
// implementation("com.google.firebase:firebase-auth-ktx")
// implementation("com.google.firebase:firebase-firestore-ktx")

package com.cyberking.shayarilok.social

import com.google.firebase.FirebaseApp
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

class ShayariSocialRepository {

    // CRITICAL: Connect to the named Firestore database used by your Admin Monitor
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance(
        FirebaseApp.getInstance(),
        "${dbId}"
    )
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    // 1. Sync User Profile (Name, City, Address, Bio, Online Status) -> /appUsers/{uid}
    fun syncUserProfile(
        displayName: String,
        username: String,
        city: String,
        address: String,
        bio: String,
        onComplete: (Boolean, String?) -> Unit
    ) {
        val uid = auth.currentUser?.uid ?: return onComplete(false, "User not signed in")
        val payload = hashMapOf(
            "uid" to uid,
            "displayName" to displayName.take(100),
            "username" to username.replace("[^a-zA-Z0-9_.]".toRegex(), "").take(40),
            "city" to city.take(80),
            "address" to address.take(200),
            "bio" to bio.take(300),
            "isOnline" to true,
            "isBlocked" to false,
            "blockReason" to "",
            "followersCount" to 0,
            "followingCount" to 0,
            "likesReceivedCount" to 0,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        db.collection("appUsers").document(uid)
            .set(payload)
            .addOnSuccessListener { onComplete(true, null) }
            .addOnFailureListener { e -> onComplete(false, e.message) }
    }

    // 2. Real-Time Block Enforcement Check (Blocks spam users instantaneously)
    fun observeMyBlockStatus(onStatus: (isBlocked: Boolean, reason: String) -> Unit) {
        val uid = auth.currentUser?.uid ?: return
        db.collection("appUsers").document(uid).addSnapshotListener { snap, _ ->
            if (snap != null && snap.exists()) {
                val blocked = snap.getBoolean("isBlocked") ?: false
                val reason = snap.getString("blockReason") ?: ""
                onStatus(blocked, reason)
            }
        }
    }

    // 3. Follow or Like Another User -> /socialEdges/{actorId}_{type}_{targetId}
    fun sendSocialInteraction(
        targetUid: String,
        targetName: String,
        actorName: String,
        type: String // "follow" or "like"
    ) {
        val actorUid = auth.currentUser?.uid ?: return
        if (actorUid == targetUid) return
        val edgeId = "\${actorUid}_\${type}_\${targetUid}"
        val edgeData = hashMapOf(
            "actorId" to actorUid,
            "targetId" to targetUid,
            "actorName" to actorName.take(100),
            "targetName" to targetName.take(100),
            "type" to type,
            "createdAt" to FieldValue.serverTimestamp()
        )
        db.collection("socialEdges").document(edgeId).set(edgeData)
    }

    // 4. Deterministic 1-on-1 Room ID + Send Real-Time Message -> /chatRooms/{roomId}/messages
    fun buildRoomId(uidA: String, uidB: String): String {
        val sorted = listOf(uidA, uidB).sorted()
        return "room_\${sorted[0]}_\${sorted[1]}"
    }

    fun sendChatMessage(
        receiverUid: String,
        receiverName: String,
        senderName: String,
        text: String,
        onError: (String) -> Unit
    ) {
        val senderUid = auth.currentUser?.uid ?: return
        val roomId = buildRoomId(senderUid, receiverUid)
        val roomRef = db.collection("chatRooms").document(roomId)
        val msgRef = roomRef.collection("messages").document()

        val roomUpdate = hashMapOf(
            "participantIds" to listOf(senderUid, receiverUid),
            "participantNames" to listOf(senderName.take(100), receiverName.take(100)),
            "lastMessage" to text.take(1000),
            "lastSenderId" to senderUid,
            "messageCount" to FieldValue.increment(1),
            "flaggedSpam" to false,
            "updatedAt" to FieldValue.serverTimestamp()
        )

        val messagePayload = hashMapOf(
            "roomId" to roomId,
            "senderId" to senderUid,
            "senderName" to senderName.take(100),
            "receiverId" to receiverUid,
            "text" to text.take(2000),
            "isFlagged" to false,
            "createdAt" to FieldValue.serverTimestamp()
        )

        roomRef.set(roomUpdate).addOnSuccessListener {
            msgRef.set(messagePayload)
                .addOnFailureListener { e -> onError(e.message ?: "Blocked by moderation rules") }
        }.addOnFailureListener { e -> onError(e.message ?: "Failed to open chat room") }
    }

    // 5. Listen to 1-on-1 Messages in Real Time
    fun listenMessages(roomId: String, onMessages: (List<Map<String, Any>>) -> Unit) {
        db.collection("chatRooms").document(roomId)
            .collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snap, _ ->
                if (snap != null) {
                    onMessages(snap.documents.mapNotNull { it.data })
                }
            }
    }
}
`;
}
