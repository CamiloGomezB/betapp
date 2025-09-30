import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

export interface Profile {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  last_active?: string;
}

export interface DirectThread {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  last_message_at?: string;
  other_user?: Profile;
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

interface ChatContextProps {
  threads: DirectThread[];
  isLoading: boolean;
  createThread: (emailOrPhone: string) => Promise<DirectThread | null>;
  sendMessage: (threadId: string, content: string) => Promise<DirectMessage | null>;
  getMessages: (threadId: string) => Promise<DirectMessage[]>;
  refreshThreads: () => Promise<void>;
  subscribeToMessages: (threadId: string, onMessage: (message: DirectMessage) => void) => () => void;
  startPolling: (threadId: string, onNewMessages: (messages: DirectMessage[]) => void) => () => void;
}

const ChatContext = createContext<ChatContextProps>({} as ChatContextProps);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar usuario por email o teléfono
  const findUserByEmailOrPhone = async (emailOrPhone: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`)
        .single();

      if (error) {
        console.error('Error finding user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  // Crear o obtener thread existente
  const createThread = async (emailOrPhone: string): Promise<DirectThread | null> => {
    if (!user) return null;

    try {
      setIsLoading(true);

      // Buscar el usuario
      const otherUser = await findUserByEmailOrPhone(emailOrPhone);
      if (!otherUser) {
        throw new Error('Usuario no encontrado');
      }

      if (otherUser.id === user.id) {
        throw new Error('No puedes chatear contigo mismo');
      }

      // Verificar si ya existe un thread
      const { data: existingThread, error: fetchError } = await supabase
        .from('direct_threads')
        .select(`
          *,
          user_a_profile:profiles!direct_threads_user_a_fkey(*),
          user_b_profile:profiles!direct_threads_user_b_fkey(*)
        `)
        .or(`and(user_a.eq.${user.id},user_b.eq.${otherUser.id}),and(user_a.eq.${otherUser.id},user_b.eq.${user.id})`)
        .single();

      if (existingThread && !fetchError) {
        // Procesar el thread existente para obtener el usuario correcto
        const otherUserId = existingThread.user_a === user.id ? existingThread.user_b : existingThread.user_a;
        const otherUserProfile = existingThread.user_a === user.id ? existingThread.user_b_profile : existingThread.user_a_profile;
        
        return {
          ...existingThread,
          other_user: otherUserProfile
        };
      }

      // Crear nuevo thread
      const { data: newThread, error: createError } = await supabase
        .from('direct_threads')
        .insert({
          user_a: user.id,
          user_b: otherUser.id,
        })
        .select(`
          *,
          user_a_profile:profiles!direct_threads_user_a_fkey(*),
          user_b_profile:profiles!direct_threads_user_b_fkey(*)
        `)
        .single();

      if (createError) {
        console.error('Error creating thread:', createError);
        throw new Error('Error al crear conversación');
      }

      // Procesar el nuevo thread para obtener el usuario correcto
      const otherUserId = newThread.user_a === user.id ? newThread.user_b : newThread.user_a;
      const otherUserProfile = newThread.user_a === user.id ? newThread.user_b_profile : newThread.user_a_profile;
      
      const processedNewThread = {
        ...newThread,
        other_user: otherUserProfile
      };

      // Actualizar la lista de threads
      await refreshThreads();
      
      return processedNewThread;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar mensaje
  const sendMessage = async (threadId: string, content: string): Promise<DirectMessage | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(*)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      // Actualizar last_message_at en el thread
      await supabase
        .from('direct_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      // Actualizar la lista de threads
      await refreshThreads();

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  // Obtener mensajes de un thread
  const getMessages = async (threadId: string): Promise<DirectMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(*)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  // Refrescar lista de threads
  const refreshThreads = async (): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('direct_threads')
        .select(`
          *,
          user_a_profile:profiles!direct_threads_user_a_fkey(*),
          user_b_profile:profiles!direct_threads_user_b_fkey(*)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching threads:', error);
        return;
      }

      // Procesar threads para obtener el usuario correcto
      const processedThreads = data?.map(thread => {
        const otherUserId = thread.user_a === user.id ? thread.user_b : thread.user_a;
        const otherUser = thread.user_a === user.id ? thread.user_b_profile : thread.user_a_profile;
        
        return {
          ...thread,
          other_user: otherUser
        };
      }) || [];

      setThreads(processedThreads);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para suscribirse a mensajes en tiempo real
  const subscribeToMessages = (threadId: string, onMessage: (message: DirectMessage) => void) => {
    console.log('Setting up realtime subscription for thread:', threadId);
    
    const subscription = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          console.log('New message received via realtime:', payload);
          
          try {
            // Obtener el mensaje completo con la información del sender
            const { data: messageData, error } = await supabase
              .from('direct_messages')
              .select(`
                *,
                sender:profiles!direct_messages_sender_id_fkey(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (messageData && !error) {
              console.log('Message data retrieved via realtime:', messageData);
              onMessage(messageData);
            } else {
              console.error('Error retrieving message data via realtime:', error);
            }
          } catch (error) {
            console.error('Error in realtime callback:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          console.log('Message updated via realtime:', payload);
          
          try {
            const { data: messageData, error } = await supabase
              .from('direct_messages')
              .select(`
                *,
                sender:profiles!direct_messages_sender_id_fkey(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (messageData && !error) {
              console.log('Updated message data retrieved via realtime:', messageData);
              onMessage(messageData);
            }
          } catch (error) {
            console.error('Error in realtime update callback:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status for thread', threadId, ':', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime messages for thread:', threadId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to realtime messages for thread:', threadId);
        }
      });

    // Retornar función para cancelar la suscripción
    return () => {
      console.log('Unsubscribing from realtime messages for thread:', threadId);
      subscription.unsubscribe();
    };
  };

  // Función de polling como respaldo para el tiempo real
  const startPolling = (threadId: string, onNewMessages: (messages: DirectMessage[]) => void) => {
    console.log('Starting polling for thread:', threadId);
    let lastMessageCount = 0;
    let lastMessageId = '';
    
    const pollInterval = setInterval(async () => {
      try {
        const messages = await getMessages(threadId);
        
        // Verificar si hay mensajes nuevos
        if (messages.length > lastMessageCount) {
          console.log('New messages found via polling:', messages.length - lastMessageCount);
          const newMessages = messages.slice(lastMessageCount);
          onNewMessages(newMessages);
          lastMessageCount = messages.length;
        } else if (messages.length > 0 && messages[messages.length - 1].id !== lastMessageId) {
          // Verificar si el último mensaje cambió (por si se actualizó)
          console.log('Last message updated via polling');
          const lastMessage = messages[messages.length - 1];
          onNewMessages([lastMessage]);
          lastMessageId = lastMessage.id;
        }
        
        // Actualizar el ID del último mensaje
        if (messages.length > 0) {
          lastMessageId = messages[messages.length - 1].id;
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 1500); // Poll cada 1.5 segundos para ser más responsivo

    // Retornar función para cancelar el polling
    return () => {
      console.log('Stopping polling for thread:', threadId);
      clearInterval(pollInterval);
    };
  };

  // Cargar threads al inicializar
  useEffect(() => {
    if (user) {
      refreshThreads();
      
      // Suscribirse a cambios en threads para actualizar la lista automáticamente
      const subscription = supabase
        .channel('threads-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'direct_threads',
            filter: `or(user_a.eq.${user.id},user_b.eq.${user.id})`,
          },
          (payload) => {
            console.log('Thread updated via realtime:', payload);
            refreshThreads();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_threads',
            filter: `or(user_a.eq.${user.id},user_b.eq.${user.id})`,
          },
          (payload) => {
            console.log('New thread created via realtime:', payload);
            refreshThreads();
          }
        )
        .subscribe((status) => {
          console.log('Threads subscription status:', status);
        });

      // Cleanup
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{
      threads,
      isLoading,
      createThread,
      sendMessage,
      getMessages,
      refreshThreads,
      subscribeToMessages,
      startPolling,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
