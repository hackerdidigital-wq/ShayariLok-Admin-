import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  formatFirestoreTimestamp,
} from '../utils/socialMonitor';

export type MonitoredCollectionKey =
  | 'appUsers'
  | 'users'
  | 'socialEdges'
  | 'chatRooms'
  | 'publicSites';

export interface CollectionConnectionStatus {
  collection: MonitoredCollectionKey;
  aliasNote?: string;
  status: 'connecting' | 'live' | 'error';
  latencyMs: number | null;
  detail: string;
  checkedAt: string;
}

function formatTimestampValue(val: unknown): string {
  return formatFirestoreTimestamp(val);
}

export function subscribeSocialMonitorData(callbacks: {
  onUsers: (users: AppUserProfile[]) => void;
  onEdges: (edges: SocialEdgeItem[]) => void;
  onRooms: (rooms: ChatRoomItem[]) => void;
  onError?: (error: Error) => void;
  onCollectionStatus?: (
    col: 'appUsers' | 'socialEdges' | 'chatRooms',
    status: 'live' | 'error',
    detail: string
  ) => void;
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
      callbacks.onCollectionStatus?.(
        'appUsers',
        'live',
        `Streaming ${items.length} user(s)`
      );
      callbacks.onUsers(items);
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onCollectionStatus?.('appUsers', 'error', msg);
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
      callbacks.onCollectionStatus?.(
        'socialEdges',
        'live',
        `Streaming ${items.length} edge(s)`
      );
      callbacks.onEdges(items);
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onCollectionStatus?.('socialEdges', 'error', msg);
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
      callbacks.onCollectionStatus?.(
        'chatRooms',
        'live',
        `Streaming ${items.length} room(s)`
      );
      callbacks.onRooms(items);
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      callbacks.onCollectionStatus?.('chatRooms', 'error', msg);
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

export async function verifyDirectFirestoreConnection(params: {
  uid?: string | null;
  activeSiteId?: string | null;
}): Promise<CollectionConnectionStatus[]> {
  if (!db) {
    const now = new Date().toISOString();
    return (
      ['appUsers', 'users', 'socialEdges', 'chatRooms', 'publicSites'] as const
    ).map((col) => ({
      collection: col,
      status: 'error',
      latencyMs: null,
      detail: 'Firestore client is not initialized.',
      checkedAt: now,
    }));
  }

  const firestore = db;
  const nowStr = () => new Date().toISOString();

  async function probe(
    col: MonitoredCollectionKey,
    aliasNote: string | undefined,
    runner: () => Promise<string>
  ): Promise<CollectionConnectionStatus> {
    const started =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const detail = await runner();
      const latencyMs = Math.max(
        1,
        Math.round(
          (typeof performance !== 'undefined'
            ? performance.now()
            : Date.now()) - started
        )
      );
      return {
        collection: col,
        aliasNote,
        status: 'live',
        latencyMs,
        detail,
        checkedAt: nowStr(),
      };
    } catch (error) {
      const latencyMs = Math.max(
        1,
        Math.round(
          (typeof performance !== 'undefined'
            ? performance.now()
            : Date.now()) - started
        )
      );
      return {
        collection: col,
        aliasNote,
        status: 'error',
        latencyMs,
        detail: error instanceof Error ? error.message : String(error),
        checkedAt: nowStr(),
      };
    }
  }

  const siteTarget = params.activeSiteId?.trim() || params.uid?.trim() || 'healthcheck';

  const checks: Promise<CollectionConnectionStatus>[] = [
    probe('appUsers', 'canonical for appusers', async () => {
      const snap = await getDocsFromServer(
        query(collection(firestore, 'appUsers'), limit(50))
      );
      return `Connected · ${snap.size} user record(s)`;
    }),
    probe('users', 'admin workspace', async () => {
      if (!params.uid) {
        return 'Requires admin sign-in';
      }
      const snap = await getDocFromServer(doc(firestore, 'users', params.uid));
      return snap.exists()
        ? 'Connected · Admin workspace doc active'
        : 'Connected · Profile initialized on login';
    }),
    probe('socialEdges', 'follows & likes', async () => {
      const snap = await getDocsFromServer(
        query(collection(firestore, 'socialEdges'), limit(50))
      );
      return `Connected · ${snap.size} interaction edge(s)`;
    }),
    probe('chatRooms', '1-on-1 chats', async () => {
      const snap = await getDocsFromServer(
        query(collection(firestore, 'chatRooms'), limit(50))
      );
      return `Connected · ${snap.size} room(s)`;
    }),
    probe('publicSites', 'live app & site mirror', async () => {
      const snap = await getDocFromServer(
        doc(firestore, 'publicSites', siteTarget)
      );
      return snap.exists()
        ? `Connected · Live doc publicSites/${siteTarget}`
        : `Connected · Ready to publish publicSites/${siteTarget}`;
    }),
  ];

  return Promise.all(checks);
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

export async function updateAppUserProfileInFirestore(
  uid: string,
  updates: {
    displayName: string;
    username: string;
    city: string;
    address: string;
    bio: string;
    isOnline: boolean;
  }
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `appUsers/${uid}`;
  const cleanName = updates.displayName.trim().slice(0, 100) || 'Shayari User';
  const cleanHandle =
    updates.username
      .trim()
      .replace(/[^a-zA-Z0-9_.]/g, '')
      .slice(0, 40) || `user_${uid.slice(0, 6)}`;
  const safeHandle = cleanHandle.length >= 2 ? cleanHandle : `${cleanHandle}_u`;

  try {
    await updateDoc(doc(db, 'appUsers', uid), {
      displayName: cleanName,
      username: safeHandle,
      city: updates.city.trim().slice(0, 80),
      address: updates.address.trim().slice(0, 200),
      bio: updates.bio.trim().slice(0, 300),
      isOnline: Boolean(updates.isOnline),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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

export async function deleteSocialEdgeInFirestore(edgeId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  const path = `socialEdges/${edgeId}`;
  try {
    await deleteDoc(doc(db, 'socialEdges', edgeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteChatRoomInFirestore(
  roomId: string
): Promise<{ deletedMessages: number }> {
  if (!db) throw new Error('Firestore is not available.');
  const firestore = db;
  const messagesPath = `chatRooms/${roomId}/messages`;
  let deletedMessages = 0;

  try {
    const msgSnap = await getDocs(collection(firestore, 'chatRooms', roomId, 'messages'));
    for (const msgDoc of msgSnap.docs) {
      await deleteDoc(doc(firestore, 'chatRooms', roomId, 'messages', msgDoc.id));
      deletedMessages += 1;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, messagesPath);
  }

  const roomPath = `chatRooms/${roomId}`;
  try {
    await deleteDoc(doc(firestore, 'chatRooms', roomId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, roomPath);
  }

  return { deletedMessages };
}

export async function deleteAppUserInFirestore(uid: string): Promise<{
  deletedEdges: number;
  deletedRooms: number;
  deletedMessages: number;
}> {
  if (!db) throw new Error('Firestore is not available.');
  const firestore = db;
  let deletedEdges = 0;
  let deletedRooms = 0;
  let deletedMessages = 0;

  const edgeIds = new Set<string>();
  try {
    const [asActor, asTarget] = await Promise.all([
      getDocs(query(collection(firestore, 'socialEdges'), where('actorId', '==', uid))),
      getDocs(query(collection(firestore, 'socialEdges'), where('targetId', '==', uid))),
    ]);
    asActor.forEach((d) => edgeIds.add(d.id));
    asTarget.forEach((d) => edgeIds.add(d.id));
    for (const edgeId of edgeIds) {
      await deleteDoc(doc(firestore, 'socialEdges', edgeId));
      deletedEdges += 1;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `socialEdges/${uid}`);
  }

  try {
    const roomsSnap = await getDocs(
      query(
        collection(firestore, 'chatRooms'),
        where('participantIds', 'array-contains', uid)
      )
    );
    for (const roomDoc of roomsSnap.docs) {
      const res = await deleteChatRoomInFirestore(roomDoc.id);
      deletedRooms += 1;
      deletedMessages += res.deletedMessages;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `chatRooms/${uid}`);
  }

  const userPath = `appUsers/${uid}`;
  try {
    await deleteDoc(doc(firestore, 'appUsers', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }

  return { deletedEdges, deletedRooms, deletedMessages };
}

export async function cleanupDummySocialDataInFirestore(targets: {
  userIds: string[];
  edgeIds: string[];
  roomIds: string[];
}): Promise<{
  deletedUsers: number;
  deletedEdges: number;
  deletedRooms: number;
  deletedMessages: number;
}> {
  if (!db) throw new Error('Firestore is not available.');
  const firestore = db;

  let deletedUsers = 0;
  let deletedEdges = 0;
  let deletedRooms = 0;
  let deletedMessages = 0;

  const handledEdges = new Set<string>();
  const handledRooms = new Set<string>();

  for (const roomId of targets.roomIds) {
    if (handledRooms.has(roomId)) continue;
    handledRooms.add(roomId);
    const res = await deleteChatRoomInFirestore(roomId);
    deletedRooms += 1;
    deletedMessages += res.deletedMessages;
  }

  for (const edgeId of targets.edgeIds) {
    if (handledEdges.has(edgeId)) continue;
    handledEdges.add(edgeId);
    try {
      await deleteDoc(doc(firestore, 'socialEdges', edgeId));
      deletedEdges += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `socialEdges/${edgeId}`);
    }
  }

  for (const uid of targets.userIds) {
    const res = await deleteAppUserInFirestore(uid);
    deletedUsers += 1;
    deletedEdges += res.deletedEdges;
    deletedRooms += res.deletedRooms;
    deletedMessages += res.deletedMessages;
  }

  return { deletedUsers, deletedEdges, deletedRooms, deletedMessages };
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
