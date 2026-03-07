import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguage();

  const currentLangLabel = languages.find(l => l.code === currentLanguage)?.label || 'English';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#7a6a5a] hover:text-[#5a4a3a] hover:bg-[#8b7355]/10 gap-2 px-2 sm:px-4 transition-colors">
          <Globe className="h-4 w-4" />
          <span className="hidden lg:inline text-sm font-medium">{currentLangLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#f5f1ed] border-[#e2ddd8]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer text-[#5a4a3a] focus:bg-[#8b7355]/10 focus:text-[#5a4a3a] ${currentLanguage === lang.code ? 'font-bold bg-[#8b7355]/5' : ''}`}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSelector;