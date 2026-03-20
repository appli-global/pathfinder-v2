import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';

interface SocialShareCardProps {
  data: AnalysisResult;
  id?: string;
  themeIndex?: number;
}

// Module-level cache so images are fetched only once across all instances
const bgDataUriCache: Record<string, string> = {};

export const SocialShareCard: React.FC<SocialShareCardProps> = ({ data, id = "social-share-card", themeIndex = 0 }) => {
  const { archetype, skillSignature } = data;
  const [bgDataUris, setBgDataUris] = useState<Record<string, string>>({});

  // Clean text helper
  const clean = (text: string) => text.replace(/[*_`#]/g, '').trim();

  const coreStrengths = [...skillSignature]
    .sort((a, b) => b.A - a.A)
    .slice(0, 4)
    .map(s => s.subject);

  // Themes corresponding to the provided static images
  const themes = [
    {
      // Theme 0: Appli Pink
      name: 'Appli Pink',
      backgroundImage: '/images/share-pink.png',
    },
    {
      // Theme 1: Emerald Forest
      name: 'Emerald Forest',
      backgroundImage: '/images/share-green.png',
    },
    {
      // Theme 2: Midnight Blue
      name: 'Midnight Blue',
      backgroundImage: '/images/share-blue.png',
    }
  ];

  const currentTheme = themes[themeIndex] || themes[0];

  // Pre-fetch background images as data URIs so html-to-image can capture them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uris: Record<string, string> = {};
      for (const theme of themes) {
        const src = theme.backgroundImage;
        if (bgDataUriCache[src]) {
          uris[src] = bgDataUriCache[src];
          continue;
        }
        try {
          const resp = await fetch(src);
          const blob = await resp.blob();
          const dataUri: string = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          bgDataUriCache[src] = dataUri;
          uris[src] = dataUri;
        } catch (e) {
          console.warn('[SocialShareCard] Failed to preload bg', src, e);
        }
      }
      if (!cancelled) setBgDataUris(uris);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use the data URI if available, otherwise fall back to the URL path
  const resolvedBg = bgDataUris[currentTheme.backgroundImage] || currentTheme.backgroundImage;

  return (
    <div
      id={id}
      className="relative overflow-hidden rounded-[32px] bg-black"
      style={{
        width: '400px',
        height: '711px',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundImage: `url(${resolvedBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 
          LAYOUT REFINEMENT:
          - Title starts at y=180px (shifted down for final balance)
          - Divider at y=370px
          - Strengths start at y=395px
      */}

      {/* === TITLE ZONE === */}
      <div
        className="absolute z-10"
        style={{ top: '200px', left: '40px', right: '40px' }}
      >
        <p 
          className="text-white font-medium mb-1" 
          style={{ fontSize: '20px', opacity: 0.9, letterSpacing: '-0.01em' }}
        >
          I'm
        </p>
        <h1
          className="text-white font-black leading-[0.95] tracking-tight"
          style={{
            fontSize: clean(archetype.title).length > 20 ? '42px' : '56px',
            textTransform: 'none'
          }}
        >
          {clean(archetype.title)}
        </h1>
      </div>

      {/* === DIVIDER === */}
      <div 
        className="absolute z-10"
        style={{ 
          top: '370px', 
          left: '40px', 
          right: '40px', 
          height: '1px', 
          backgroundColor: 'rgba(255,255,255,0.25)' 
        }} 
      />

      {/* === CORE STRENGTHS ZONE === */}
      <div
        className="absolute z-10"
        style={{ top: '395px', left: '40px', right: '40px' }}
      >
        <h4 
          className="text-white/50 font-bold uppercase tracking-[0.2em] mb-4"
          style={{ fontSize: '10px' }}
        >
          CORE STRENGTHS
        </h4>
        <div className="flex flex-col gap-4">
          {coreStrengths.map((skill, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <span className="text-white font-bold mt-[6px]" style={{ fontSize: '20px', opacity: 0.8 }}>*</span>
              <span className="text-white text-[24px] font-black tracking-tight leading-[1.15]">{clean(skill)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === FOOTER === */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[44px] bg-black px-10 flex justify-between items-center rounded-b-[32px] z-20"
      >
        <p className="text-white/60 text-[10px] font-bold tracking-tight">Discover your path on Appli.</p>
        <div className="flex items-center gap-2">
          <p className="text-white/60 text-[10px] font-bold tracking-tight">pathfinder.appli.global</p>
          <div className="flex items-center justify-center translate-y-[1px]">
            <svg width="24" height="24" viewBox="0 3 36 36" fill="none">
              <path d="M10.7736 5.42418C11.3678 5.1522 11.9112 5.15225 12.4035 5.42418L25.2931 12.5677C24.1724 12.4657 23.3567 12.4144 22.8302 12.4144C21.8624 12.4144 20.9116 12.5168 19.9777 12.6869C19.0608 12.8569 18.2454 13.1625 17.4982 13.5707C16.7511 13.9788 16.1229 14.5066 15.6135 15.1869C15.104 15.8672 14.7643 16.701 14.6115 17.7045H19.0773C19.2302 16.9051 19.6383 16.3091 20.3176 15.9349C20.9967 15.5439 21.744 15.3568 22.5929 15.3568C22.8985 15.3568 23.2379 15.3742 23.5773 15.4252C23.917 15.4762 24.2404 15.5782 24.5461 15.7142C24.8346 15.8672 25.0895 16.054 25.2931 16.3089C25.4969 16.5641 25.5988 16.8881 25.5988 17.2963C25.5987 17.8063 25.4622 18.1975 25.1906 18.4525C24.9189 18.7245 24.5112 18.9112 23.9679 19.0472C23.4246 19.1833 22.7453 19.2683 21.9133 19.3363C21.0812 19.3873 20.0961 19.4897 18.9924 19.6088C16.9038 19.8469 15.274 20.4257 14.1193 21.3441C12.9815 22.2795 12.4035 23.521 12.4035 25.0687C12.4035 25.6298 12.5226 26.1572 12.7433 26.6673C12.9641 27.1605 13.3041 27.6024 13.7795 27.9935C14.2549 28.3676 14.8319 28.6744 15.5451 28.9125C16.2583 29.1336 17.074 29.2523 18.008 29.2523L18.84 29.2689L7.47869 34.5755C6.88444 34.8475 6.34119 34.8476 5.8488 34.5755C5.35639 34.3034 5.15257 33.8952 5.23748 33.3509L9.75505 6.66637C9.83996 6.10511 10.1793 5.6963 10.7736 5.42418ZM24.2052 22.7211C24.0694 23.1633 23.8993 23.6054 23.6955 24.0306C23.5088 24.4556 23.2374 24.8298 22.881 25.1869C22.5414 25.527 22.1164 25.8168 21.59 26.0209C21.0977 26.2419 20.4355 26.3441 19.7394 26.3441C19.0432 26.3441 18.4309 26.1908 17.9045 25.9017C17.3782 25.5956 17.1066 25.1531 17.1066 24.558C17.1066 24.0648 17.2085 23.6565 17.4123 23.3334C17.633 23.0103 17.8876 22.7548 18.2101 22.5677C18.5158 22.3977 18.8897 22.2616 19.3312 22.1595C19.7557 22.0745 20.1804 22.0065 20.6388 21.9554C21.2162 21.9214 21.9126 21.8705 22.7277 21.7855C23.4409 21.7005 24.0865 21.4963 24.6808 21.1732L24.2052 22.7211ZM34.259 17.517C34.7343 17.789 35.0913 18.1458 35.2951 18.6048C35.4989 19.03 35.5499 19.5066 35.465 19.9828C35.3801 20.476 35.1591 20.9521 34.8195 21.3773C34.4459 21.8365 33.9877 22.1941 33.4103 22.4662L28.3498 24.8304L29.674 19.3197C29.9287 18.2824 30.048 17.3809 30.048 16.6156C30.065 16.0034 29.9627 15.4761 29.759 15.017L34.259 17.517Z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
