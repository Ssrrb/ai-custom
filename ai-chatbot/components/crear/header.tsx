'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Bot, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';

export function CrearHeader() {
  const router = useRouter();
  return (
    <header className="bg-background shadow-sm sticky top-0 z-50 border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <Bot className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-2xl font-bold text-foreground tracking-tight">
            IA SoftShop
          </span>
        </Link>
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/contacto"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Contacto
          </Link>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 w-64 border rounded-md focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          </div>
        </div>
        {/* Actions: Chat & Mobile Menu */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            Chat
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-6 h-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex justify-between items-center px-4 py-3 border-b">
                <span className="text-lg font-semibold text-foreground">
                  Menú
                </span>
                <Button variant="ghost" size="icon">
                  <X className="w-5 h-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </div>
              <nav className="flex flex-col gap-2 px-4 py-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-foreground hover:text-primary font-medium"
                >
                  <Bot className="w-5 h-5" />
                  <span>Inicio</span>
                </Link>
                <Link
                  href="/contacto"
                  className="text-foreground hover:text-primary font-medium"
                >
                  Contacto
                </Link>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => router.push('/')}
                >
                  Chat
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
