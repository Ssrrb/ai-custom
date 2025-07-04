'use client';

import { z } from 'zod';
import type { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const assistantSchema = z.object({
  nombre_bot: z.string().min(2, 'El nombre del bot es requerido').max(50),
  nombre_negocio: z
    .string()
    .min(2, 'El nombre del negocio es requerido')
    .max(50),
  descripcion_corta_negocio: z
    .string()
    .min(10, 'La descripción es requerida')
    .max(200),
  objetivo_principal: z
    .string()
    .min(10, 'El objetivo es requerido')
    .max(500),
  personalidad_adjetivos: z
    .string()
    .min(3, 'La personalidad es requerida')
    .max(100),
});

export type AssistantFormValues = z.infer<typeof assistantSchema>;

interface AssistantFormProps {
  control: Control<AssistantFormValues>;
}

export function AssistantForm({ control }: AssistantFormProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="nombre_bot"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Asistente</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Asistente de Jardinería" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="nombre_negocio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre del Negocio</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Vivero El Trébol" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="descripcion_corta_negocio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción Corta del Negocio</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Ej: Somos un vivero familiar con 20 años de experiencia..."
                className="min-h-24"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="objetivo_principal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Objetivo Principal del Asistente</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Ej: Ayudar a los clientes a elegir las mejores plantas para su hogar y responder sus dudas de jardinería."
                className="min-h-36"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="personalidad_adjetivos"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Adjetivos de Personalidad</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Amable, paciente, experto, creativo"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
