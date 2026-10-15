import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { messageApi } from '../lib/api';
import wsClient from '../lib/websocket';
import { Message } from '../types';
import Navbar from '../components/Navbar';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for new messages via WebSocket
    const unsubscribe = wsClient.on('message', (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadMessages = async () => {
    if (!user?.family_id) {
      setError('You must be part of a family to view messages');
      setIsLoading(false);
      return;
    }

    try {
      const response = await messageApi.getMessages();
      setMessages(response.messages || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.error || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    if (!user?.family_id) {
      toast.error('You must be part of a family to send messages');
      return;
    }

    setIsSending(true);

    try {
      const response = await messageApi.sendMessage({
        content: newMessage.trim(),
      });

      // Add the new message to the list
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      toast.success('Message sent!');
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!user?.family_id) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center px-4">
          <div className="card max-w-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join a Family First
            </h2>
            <p className="text-gray-600 mb-6">
              You need to be part of a family group to send and receive messages.
            </p>
            <button
              onClick={() => window.location.href = '/family'}
              className="btn btn-primary w-full"
            >
              Go to Family Page
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="h-screen pt-16 flex flex-col bg-gray-50">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Family Messages
                </h1>
                <p className="text-sm text-gray-500">
                  Chat with your family members
                </p>
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
                  <p className="text-gray-600">Loading messages...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-gray-800 font-medium mb-2">
                    Failed to load messages
                  </p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={loadMessages}
                    className="btn btn-primary"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Start a conversation with your family
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={clsx(
                        'flex',
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={clsx(
                          'max-w-md sm:max-w-lg rounded-2xl px-4 py-3 shadow-sm',
                          isOwnMessage
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        )}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-semibold mb-1 text-primary-600">
                            {message.sender_name}
                          </p>
                        )}
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p
                          className={clsx(
                            'text-xs mt-2',
                            isOwnMessage
                              ? 'text-primary-100'
                              : 'text-gray-500'
                          )}
                        >
                          {formatDistanceToNow(new Date(message.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-4">
            <form onSubmit={handleSendMessage} className="flex gap-2 max-w-6xl mx-auto">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="input flex-1"
                disabled={isSending}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="btn btn-primary flex items-center gap-2 px-6"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
