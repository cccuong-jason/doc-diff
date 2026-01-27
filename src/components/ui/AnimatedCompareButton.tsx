import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GitCompare, Zap, ArrowRight } from 'lucide-react';

interface AnimatedCompareButtonProps {
    onClick: () => void;
    disabled?: boolean;
    isComparing: boolean;
    canCompare: boolean;
}

export function AnimatedCompareButton({
    onClick,
    disabled,
    isComparing,
    canCompare
}: AnimatedCompareButtonProps) {
    return (
        <div className="relative group">
            {/* Pulse Effect Background */}
            {canCompare && !isComparing && (
                <>
                    <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 blur-xl animate-pulse-glow" />
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-30 blur-md group-hover:opacity-60 transition-opacity duration-500 animate-gradient" />
                </>
            )}

            <Button
                size="lg"
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    "relative h-20 w-20 rounded-full shadow-2xl transition-all duration-500 border-4 border-background overflow-hidden",
                    canCompare
                        ? "scale-100 hover:scale-110 bg-gradient-to-br from-blue-600 to-purple-700 text-white"
                        : "scale-95 opacity-50 grayscale bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600",
                    isComparing && "scale-105 rotate-180"
                )}
            >
                {/* Inner Content Layer */}
                <div className="relative z-10 flex items-center justify-center">
                    {isComparing ? (
                        <Zap className="w-10 h-10 animate-bounce text-yellow-300 drop-shadow-md" />
                    ) : (
                        <div className="relative">
                            <GitCompare className={cn("w-10 h-10 transition-transform duration-500", canCompare && "group-hover:rotate-180")} />
                            {canCompare && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            )}
                        </div>
                    )}
                </div>

                {/* Shine Effect Overlay */}
                {canCompare && !isComparing && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                )}
            </Button>

            {/* Label Tooltip (below) */}
            {canCompare && !isComparing && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                    <div className="bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1 shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                        <span className="font-semibold">Click to Compare</span>
                        <ArrowRight className="w-3 h-3 animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    );
}
