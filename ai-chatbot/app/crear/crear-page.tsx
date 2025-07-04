'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import useSWR from 'swr';
import { CrearHeader } from '@/components/crear/header';
import {
  AssistantForm,
  assistantSchema,
  type AssistantFormValues,
} from '@/components/crear/assistant-form';
import { AddDocs } from '@/components/crear/add-docs';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Define a fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  // If the user doesn't have data, the API returns 404, which is expected.
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return response.json();
};

export default function CrearPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch existing assistant data
  const {
    data: initialData,
    error: fetchError,
    isLoading,
  } = useSWR('/crear/api/form', fetcher);

  const form = useForm<AssistantFormValues>({
    resolver: zodResolver(assistantSchema),
    defaultValues: {
      nombre_bot: '',
      nombre_negocio: '',
      descripcion_corta_negocio: '',
      objetivo_principal: '',
      personalidad_adjetivos: '',
    },
    mode: 'onTouched',
  });

  // Populate the form if data exists
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      setIsEditMode(true);
    }
  }, [initialData, form]);

  useEffect(() => {
    if (fetchError) {
      toast.error('Error al cargar la configuración del asistente.');
    }
  }, [fetchError]);

  const onSubmit = async (values: AssistantFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/crear/api/form', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to ${isEditMode ? 'update' : 'create'} assistant.`,
        );
      }

      toast.success(
        `Asistente ${isEditMode ? 'actualizado' : 'creado'} con éxito!`,
      );
      // Redirect to the new chat if a chatId is returned
      if (result.chatId) {
        router.push(`/chat/${result.chatId}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <CrearHeader />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-10 w-1/3" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <CrearHeader />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {isEditMode ? 'Actualizar Asistente' : 'Crear Nuevo Asistente'}
          </h1>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración</CardTitle>
                  <CardDescription>
                    {isEditMode
                      ? 'Modifica los campos para actualizar la configuración de tu Asistente.'
                      : 'Completa los siguientes campos para configurar la identidad y el propósito de tu Asistente.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AssistantForm control={form.control} />
                </CardContent>
              </Card>
              <AddDocs />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isEditMode ? 'Actualizar Asistente' : 'Crear Asistente'}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
