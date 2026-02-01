'use client';

import { Button } from '@/components/ui/button';
import { translations } from '@/lib/i18n';
import { useComparisonStore } from '@/stores/comparison-store';
import { FileText, Languages, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { HistoryModal } from '@/components/history/HistoryModal';

export function Header() {
    const { language, setLanguage, reset } = useComparisonStore();
    const [isDark, setIsDark] = useState(false);
    const t = translations[language];

    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'vi' : 'en');
    };

    const handleLogoClick = useCallback(() => {
        // Full reset
        reset();

        // Clear URL
        window.history.pushState({}, '', '/');
    }, [reset]);

    const navItems = [
        { href: '/', label: t.home, icon: FileText },
        // History is now in sidebar
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-6">
                    <div onClick={handleLogoClick} className="cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity">
                        <img
                            src="/logo.png"
                            alt={t.appName}
                            className="h-8 w-auto object-contain"
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        <HistoryModal />
                        {/* More nav items if needed */}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleLanguage}
                        title={language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
                    >
                        <Languages className="w-4 h-4" />
                        <span className="sr-only">Toggle Language</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                        <span className="sr-only">Toggle Theme</span>
                    </Button>
                </div>
            </div>
        </header >
    );
}
