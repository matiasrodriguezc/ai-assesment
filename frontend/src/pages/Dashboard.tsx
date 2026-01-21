import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle, MessageSquare, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get('/documents')).data,
    refetchInterval: 2000, 
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/documents', formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      await uploadMutation.mutateAsync(e.target.files[0]);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Document AI
                </h1>
                <p className="text-xs text-gray-500">Intelligent Document Management</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/chat')} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] font-medium"
              >
                <MessageSquare size={18} />
                AI Chat
              </button>
              <button 
                onClick={logout}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition text-gray-600"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Documents</p>
                <p className="text-2xl font-bold text-gray-800">{documents?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Processed</p>
                <p className="text-2xl font-bold text-gray-800">
                  {documents?.filter((d: any) => d.status === 'COMPLETED').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Sparkles className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">In Process</p>
                <p className="text-2xl font-bold text-gray-800">
                  {documents?.filter((d: any) => d.status === 'PROCESSING' || d.status === 'PENDING').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all shadow-lg mb-8">
          <input 
            type="file" 
            id="file" 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.md,.csv,.json,.js,.ts,.py" 
            onChange={handleUpload} 
            disabled={uploading} 
          />
          <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
            {uploading ? (
              <Loader2 className="animate-spin h-16 w-16 text-blue-500 mb-4" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            )}
            <span className="text-lg font-semibold text-gray-700 mb-2">
              {uploading ? 'Processing your document...' : 'Upload a new document'}
            </span>
            <span className="text-sm text-gray-500">
              {uploading ? 'Analyzing and protecting your data...' : 'Supports PDF, JPG, PNG, TXT, MD, CSV, JS...'}
            </span>
          </label>
        </div>

        {/* Documents Grid */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={24} className="text-blue-600" />
            Your Documents
          </h2>
          
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {documents?.map((doc: any) => (
              <div 
                key={doc.id} 
                className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="text-blue-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{doc.originalName}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(doc.createdAt).toLocaleDateString('en-US', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>
                    
                    {doc.status === 'COMPLETED' && doc.metadata && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm text-gray-700 mb-3">
                          <span className="font-semibold text-gray-800">Summary: </span>
                          {doc.metadata.summary}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {doc.metadata.tags?.map((tag: string) => (
                            <span 
                              key={tag} 
                              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && documents?.length === 0 && (
            <div className="text-center py-16 bg-white/50 rounded-2xl border border-dashed border-gray-300">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No documents yet</p>
              <p className="text-gray-400 text-sm mt-2">Upload your first document to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getStatusBadge(status: string) {
  const configs = {
    PENDING: { 
      bg: "bg-yellow-100 border-yellow-200", 
      text: "text-yellow-700",
      icon: Loader2,
      label: "Queued"
    },
    PROCESSING: { 
      bg: "bg-blue-100 border-blue-200", 
      text: "text-blue-700",
      icon: Loader2,
      label: "Processing"
    },
    COMPLETED: { 
      bg: "bg-green-100 border-green-200", 
      text: "text-green-700",
      icon: CheckCircle,
      label: "Completed"
    },
    FAILED: { 
      bg: "bg-red-100 border-red-200", 
      text: "text-red-700",
      icon: AlertCircle,
      label: "Failed"
    }
  };
  
  // @ts-ignore
  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;
  
  return (
    <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border ${config.bg} ${config.text}`}>
      <Icon size={12} className={status === 'PROCESSING' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}