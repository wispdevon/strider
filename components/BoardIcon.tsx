'use client';

import { useMemo, useState } from 'react';

interface BoardIconProps {
  emoji?: string;
  websiteUrl?: string | null;
  className?: string;
  imageClassName?: string;
}

function getFaviconUrl(websiteUrl?: string | null) {
  if (!websiteUrl) return null;

  try {
    const normalized = websiteUrl.includes('://') ? websiteUrl : `https://${websiteUrl}`;
    const url = new URL(normalized);
    if (url.protocol !== 'https:') return null;
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

export default function BoardIcon({
  emoji = '📋',
  websiteUrl,
  className = 'text-2xl',
  imageClassName = 'w-7 h-7 rounded-md',
}: BoardIconProps) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = useMemo(() => getFaviconUrl(websiteUrl), [websiteUrl]);

  if (faviconUrl && !failed) {
    return (
      <img
        src={faviconUrl}
        alt=""
        aria-hidden="true"
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {emoji || '📋'}
    </span>
  );
}
