import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AppUserProfile,
  ChatMessageItem,
  ChatRoomItem,
  SocialEdgeItem,
} from '../types/config';
import {
  DEMO_APP_USERS,
  DEMO_CHAT_MESSAGES,
  DEMO_CHAT_ROOMS,
  DEMO_SOCIAL_EDGES,
} from '../utils/socialMonitor';

function formatTimestampValue(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val) {
    const fn = (val as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') {
      return fn().toISOString();
    }
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function subscribeSocialMonitorData(callbacks: {
  onUsers: (users: AppUserProfile[]) => void;
  onEdges: (edges: SocialEdgeItem[]) => void;
  onRooms: (rooms: ChatRoomItem[]) => void;
  onError?: (error: Error) => void;
}): Unsubscribe {
  if (!db) return () => {};

  const usersQuery = query(
    collection(db, 'appUsers'),
    orderBy('updatedAt', 'desc'),
    limit(150)
  );
  const unsubUsers = onSnapshot(
    usersQuery,
    (snap) => {
      const items: AppUserProfile[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: String(data.uid ?? d.id),
          displayName: String(data.displayName ?? 'Unknown User'),
          username: String(data.username ?? 'user'),
          city: String(data.city ?? ''),
          address: String(data.address ?? ''),
          bio: String(data.bio ?? ''),
          isOnline: Boolean(data.isOnline),
          isBlocked: Boolean(data.isBlocked),
          blockReason: String(data.blockReason ?? ''),
          followersCount: Number(data.followersCount ?? 0),
          followingCount: Number(data.followingCount ?? 0),
          likesReceivedCount: Number(data.likesReceivedCount ?? 0),
          createdAt: formatTimestampValue(data.createdAt),
          updatedAt: formatTimestampValue(data.updatedAt),
        };
      });
      callbacks.onUsers(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'appUsers');
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  const edgesQuery = query(
    collection(db, 'socialEdges'),
    orderBy('createdAt', 'desc'),
    limit(300)
  );
  const unsubEdges = onSnapshot(
    edgesQuery,
    (snap) => {
      const items: SocialEdgeItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actorId: String(data.actorId ?? ''),
          targetId: String(data.targetId ?? ''),
          actorName: String(data.actorName ?? ''),
          targetName: String(data.targetName ?? ''),
          type: data.type === 'like' ? 'like' : 'follow',
          createdAt: formatTimestampValue(data.createdAt),
        };
      });
      callbacks.onEdges(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'socialEdges');
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  const roomsQuery = query(
    collection(db, 'chatRooms'),
    orderBy('updatedAt', 'desc'),
    limit(100)
  );
  const unsubRooms = onSnapshot(
    roomsQuery,
    (snap) => {
      const items: ChatRoomItem[] = snap.docs.map((d) => {
        const data = d.data();
        const pIds = Array.isArray(data.participantIds)
          ? data.participantIds.map(String)
          : ['', ''];
        const pNames = Array.isArray(data.participantNames)
          ? data.participantNames.map(String)
          : ['User A', 'User B'];
        return {
          id: d.id,
          participantIds: [pIds[0] || '', pIds[1] || ''],
          participantNames: [pNames[0] || 'User A', pNames[1] || 'User B'],
          lastMessage: String(data.lastMessage ?? ''),
          lastSenderId: String(data.lastSenderId ?? ''),
          messageCount: Number(data.messageCount ?? 0),
          flaggedSpam: Boolean(data.flaggedSpam),
          updatedAt: formatTimestampValue(data.updatedAt),
        };
      });
      callbacks.onRooms(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'chatRooms');
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  return () => {
    unsubUsers();
    unsubEdges();
    unsubRooms();
  };
}

export function subscribeChatRoomMessages(
  roomId: string,
  onMessages: (messages: ChatMessageItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db || !roomId) return () => {};
  const path = `chatRooms/${roomId}/messages`;
  const msgQuery = query(
    collection(db, 'chatRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(200)
  );

  return onSnapshot(
    msgQuery,
    (snap) => {
      const items: ChatMessageItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          roomId: String(data.roomId ?? roomId),
          senderId: String(data.senderId ?? ''),
          senderName: String(data.senderName ?? 'User'),
          receiverId: String(data.receiverId ?? ''),
          text: String(data.text ?? ''),
          isFlagged: Boolean(data.isFlagged),
          createdAt: formatTimestampValue(data.createdAt),
        };
      });
      onMessages(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function toggleAppUserBlockInFirestore(
  uid: string,
  blocked: boolean,
  reason: string
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `appUsers/${uid}`;
  try {
    await updateDoc(doc(db, 'appUsers', uid), {
      isBlocked: blocked,
      blockReason: blocked ? reason.trim().slice(0, 240) || 'Blocked by Admin' : '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleChatRoomSpamFlagInFirestore(
  roomId: string,
  flagged: boolean
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `chatRooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'chatRooms', roomId), {
      flaggedSpam: flagged,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleMessageFlagInFirestore(
  roomId: string,
  messageId: string,
  flagged: boolean
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `chatRooms/${roomId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chatRooms', roomId, 'messages', messageId), {
      isFlagged: flagged,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteChatMessageInFirestore(
  roomId: string,
  messageId: string
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `chatRooms/${roomId}/messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'chatRooms', roomId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDemoSocialDataToFirestore(): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const firestore = db;

  try {
    for (const user of DEMO_APP_USERS) {
      await setDoc(doc(firestore, 'appUsers', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        username: user.username,
        city: user.city,
        address: user.address,
        bio: user.bio,
        isOnline: user.isOnline,
        isBlocked: user.isBlocked,
        blockReason: user.blockReason,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        likesReceivedCount: user.likesReceivedCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const edge of DEMO_SOCIAL_EDGES) {
      await setDoc(doc(firestore, 'socialEdges', edge.id), {
        actorId: edge.actorId,
        targetId: edge.targetId,
        actorName: edge.actorName,
        targetName: edge.targetName,
        type: edge.type,
        createdAt: serverTimestamp(),
      });
    }

    for (const room of DEMO_CHAT_ROOMS) {
      await setDoc(doc(firestore, 'chatRooms', room.id), {
        participantIds: room.participantIds,
        participantNames: room.participantNames,
        lastMessage: room.lastMessage,
        lastSenderId: room.lastSenderId,
        messageCount: room.messageCount,
        flaggedSpam: room.flaggedSpam,
        updatedAt: serverTimestamp(),
      });

      const msgs = DEMO_CHAT_MESSAGES[room.id] ?? [];
      for (const msg of msgs) {
        await setDoc(doc(firestore, 'chatRooms', room.id, 'messages', msg.id), {
          roomId: room.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          receiverId: msg.receiverId,
          text: msg.text,
          isFlagged: msg.isFlagged,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appUsers/seed');
  }
}
