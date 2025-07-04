# Chatbot SoftShop 🤖

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org)
[![AI SDK](https://img.shields.io/badge/AI_SDK-Vercel-blue?style=flat&logo=vercel)](https://sdk.vercel.ai/docs)

> Un chatbot de IA listo para Next.js 14 y App Router, desarrollado para la demostración de agosto por SoftShop.

<p align="center">
  <img alt="Logo SoftShop" src="public/images/softshop_sa_logo.jpeg" width="200">
</p>

<p align="center">
  <a href="#documentación"><strong>Documentación</strong></a> ·
  <a href="#características"><strong>Características</strong></a> ·
  <a href="#proveedores-de-modelos"><strong>Proveedores de Modelos</strong></a> ·
  <a href="#ejecutar-localmente"><strong>Ejecutar Localmente</strong></a>
</p>

## Características ✨

- **[Next.js](https://nextjs.org) App Router**
  - Enrutamiento avanzado para una navegación fluida y alto rendimiento.
  - Componentes de servidor React (RSCs) y acciones de servidor para renderizado del lado del servidor y mayor velocidad.
- **[AI SDK](https://sdk.vercel.ai/docs)**
  - API unificada para generar texto, objetos estructurados y llamadas a herramientas con LLMs.
  - Hooks para construir interfaces de usuario dinámicas de chat y generativas.
  - Soporte para xAI (por defecto), OpenAI, Fireworks y otros proveedores de modelos.
- **[shadcn/ui](https://ui.shadcn.com)**
  - Estilizado con [Tailwind CSS](https://tailwindcss.com).
  - Componentes primitivos de [Radix UI](https://radix-ui.com) para accesibilidad y flexibilidad.
- **Persistencia de Datos**
  - [Neon Serverless Postgres](https://neon.tech) para guardar el historial de chat y datos de usuario.
  - Refactoriznado para usar Google Cloud Storage para un almacenamiento eficiente de archivos en lugar de Vercel Blob.
- **[Auth.js](https://authjs.dev)**
  - Autenticación simple y segura.

## Proveedores de Modelos 🌐

Este proyecto viene configurado con [OpenAI](https://openai.com) `gpt-4o-mini` como modelo de chat predeterminado. Sin embargo, con el [AI SDK](https://sdk.vercel.ai/docs), puedes cambiar de proveedor de LLM a [xAI](https://x.ai), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/) y [muchos más](https://sdk.vercel.ai/providers/ai-sdk-providers) con solo unas pocas líneas de código.

## Ejecutar Localmente 🚀

Necesitarás usar las variables de entorno definidas en [`.env.example`](.env.example) para ejecutar el Chatbot SoftShop de Next.js.

> Nota: No debes cometer tu archivo `.env` o expondrás secretos que permitirán a otros controlar el acceso a tus cuentas de proveedores de IA y autenticación.

```bash
pnpm install
pnpm dev
```

Tu plantilla de aplicación debería estar ejecutándose en [localhost:3000](http://localhost:3000).

## Tareas Pendientes 📋

1. Refactorizar para trabajar con WebSockets en lugar de HTTP, enviando la respuesta del modelo de una vez completa y mostrando los pensamientos en tiempo real.
2. Conectarse a `messaging_service` para recibir los mensajes del backend (`base_chatbot`) y enviarlos al frontend.
3. En lugar de llamar directamente a un modelo de IA, publicará mensajes en tu canal existente de Redis `nlp_channel`. Esto activará tu `nlp_service` actual para procesar el mensaje.
4. Manejar respuestas en tiempo real: Implementar un mecanismo en un servicio para escuchar respuestas de tu `nlp_service` en el canal de mensajes de Redis. Estas respuestas se enviarán al navegador del usuario en tiempo real.

## Explicación del Proyecto ℹ️

1. Esta aplicación tiene modelos base en el archivo `models.ts`. Hay otro proyecto llamado `base_chatbot` que se encarga de recibir los mensajes del frontend, hacer los embeddings, colocarlos en la base de datos vectorial, realizar la búsqueda RAG y devolver la respuesta final a través de Redis `nlp_channel`, que será escuchado por una API para enviar la respuesta al frontend. La idea es que el usuario pueda ver el pensamiento del modelo en tiempo real.
2. El proyecto actual se encarga de recibir los mensajes del frontend, enviarlos al backend (`base_chatbot`), recibir la respuesta final del backend y devolverla al frontend.
