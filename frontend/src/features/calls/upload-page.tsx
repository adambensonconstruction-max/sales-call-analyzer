import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileAudio,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/shared/page-header';
import { useUploadCall } from '@/hooks/use-calls';
import { formatFileSize } from '@/lib/utils';

const ACCEPTED_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
  'audio/flac': ['.flac'],
};

interface FileWithPreview {
  file: File;
  name: string;
  preview?: string;
}

export function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [callName, setCallName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const uploadMutation = useUploadCall();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile({
        file,
        name: file.name,
      });
      // Auto-generate a call name from filename
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setCallName(baseName);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 52_428_800, // 50MB
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile.file,
        name: callName || undefined,
      });
      clearInterval(interval);
      setUploadProgress(100);

      // Navigate to the call detail after a brief delay
      setTimeout(() => {
        navigate(`/app/calls/${result.data.id}`);
      }, 800);
    } catch {
      clearInterval(interval);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setCallName('');
    setUploadProgress(0);
  };

  const isUploading = uploadMutation.isPending;
  const isSuccess = uploadMutation.isSuccess;

  return (
    <div>
      <PageHeader
        title="Upload Call"
        description="Upload a sales call recording for AI analysis"
      />

      <div className="max-w-2xl mx-auto">
        {/* Drop Zone */}
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div
                {...getRootProps()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center ${
                  isDragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : isDragReject
                    ? 'border-destructive bg-destructive/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                      isDragActive ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <Upload
                      className={`h-7 w-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </motion.div>

                  <div>
                    <p className="text-base font-medium mb-1">
                      {isDragActive
                        ? 'Drop your file here'
                        : isDragReject
                        ? 'File type not supported'
                        : 'Drag & drop your audio file'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse • MP3, WAV, M4A, OGG, FLAC up to 50MB
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="glass-hover">
                <CardContent className="p-6">
                  {/* File info */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <FileAudio className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.file.size)} • {selectedFile.file.type.split('/')[1]?.toUpperCase()}
                      </p>
                    </div>
                    {!isUploading && !isSuccess && (
                      <Button variant="ghost" size="icon-sm" onClick={removeFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Call name input */}
                  {!isUploading && !isSuccess && (
                    <div className="space-y-2 mb-6">
                      <label htmlFor="call-name" className="text-sm font-medium">
                        Call Name <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        id="call-name"
                        placeholder="e.g., Johnson Kitchen Remodel"
                        value={callName}
                        onChange={(e) => setCallName(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Progress */}
                  {(isUploading || isSuccess) && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          {isSuccess ? 'Upload complete' : 'Uploading...'}
                        </span>
                        <span className="font-medium tabular-nums">
                          {Math.round(uploadProgress)}%
                        </span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  {/* Status indicator */}
                  <AnimatePresence>
                    {isSuccess && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 text-emerald-500 mb-4"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Uploaded! Redirecting to analysis...
                        </span>
                      </motion.div>
                    )}
                    {uploadMutation.isError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 text-destructive mb-4"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          {uploadMutation.error?.message || 'Upload failed'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  {!isSuccess && (
                    <div className="flex gap-3">
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="flex-1"
                        variant="glow"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload & Analyze
                          </>
                        )}
                      </Button>
                      {!isUploading && (
                        <Button variant="outline" size="lg" onClick={removeFile}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-3"
        >
          <h3 className="text-sm font-medium text-muted-foreground">Tips for best results</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Ensure clear audio quality with minimal background noise',
              'Calls between 5-60 minutes work best for analysis',
              'Both speaker voices should be clearly audible',
              'First-visit sales calls give the richest insights',
            ].map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"
              >
                <span className="text-primary font-bold shrink-0">{i + 1}</span>
                {tip}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
