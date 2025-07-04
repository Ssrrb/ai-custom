'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  UploadCloud,
  File as FileIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UploadedFileState {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

export function AddDocs() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFileState[] = acceptedFiles.map((file) => ({
      id: nanoid(),
      file,
      status: 'uploading',
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    const formData = new FormData();
    newFiles.forEach(newFile => {
      formData.append('file', newFile.file);
    });

    try {
      const response = await fetch('/crear/api/docs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir los archivos');
      }

      const result = await response.json();
      const urls: string[] = result.urls;

      setUploadedFiles((prev) =>
        prev.map((f) => {
          const newFileIndex = newFiles.findIndex(nf => nf.id === f.id);
          if (newFileIndex !== -1) {
            return { ...f, status: 'success', url: urls[newFileIndex] };
          }
          return f;
        }),
      );
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) => {
          if (newFiles.some(nf => nf.id === f.id)) {
            return {
              ...f,
              status: 'error',
              error: (error as Error).message,
            };
          }
          return f;
        }),
      );
    }
  }, []);

  const removeFile = (idToRemove: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== idToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'text/plain': ['.txt'],
    },
  });

  return (
    <Card className="bg-background shadow-lg border rounded-xl">
      <CardHeader>
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <CardTitle className="text-xl font-semibold text-foreground">
              Subí tus Documentos
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Sube documentos para que tu asistente de IA los tenga en contexto.
              <br />
              <span className="text-xs text-muted-foreground">
                PDF, DOCX, TXT. Max 10MB.
              </span>
            </CardDescription>
          </div>
          <div className="md:col-span-1 flex flex-col items-center md:items-end">
            <div
              {...getRootProps()}
              className={`w-full p-6 text-center cursor-pointer rounded-lg border-2 border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-primary hover:bg-muted'
              }`}
              role="button"
              tabIndex={0}
              aria-label="Subir documentos"
            >
              <input {...getInputProps()} />
              <UploadCloud
                className={`size-10 ${
                  isDragActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-semibold text-primary">
                  Click para subir
                </span>{' '}
                o arrastrar y soltar
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      {uploadedFiles.length > 0 && (
        <CardContent>
          <h3 className="text-lg font-medium mb-4">Archivos Subidos</h3>
          <div className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg border"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileIcon className="size-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {uploadedFile.file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'uploading' && (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  )}
                  {uploadedFile.status === 'success' && (
                    <CheckCircle2 className="size-5 text-green-500" />
                  )}
                  {uploadedFile.status === 'error' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="size-5 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{uploadedFile.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(uploadedFile.id)}
                    aria-label={`Eliminar ${uploadedFile.file.name}`}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
