import React, { useState, useEffect } from 'react';
import { Download, Sparkles, ExternalLink, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'Ankith-gangadhar/BillingSystem';

export interface ReleaseInfo {
  tagName: string;
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrl: string | null;
  hasUpdate: boolean;
}

export function useAppUpdate() {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  const checkForUpdates = async (force: boolean = false) => {
    try {
      setIsChecking(true);
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          // No releases yet
          setReleaseInfo({
            tagName: `v${CURRENT_VERSION}`,
            version: CURRENT_VERSION,
            name: 'Latest Version',
            body: 'You are running the latest version.',
            publishedAt: new Date().toISOString(),
            htmlUrl: `https://github.com/${GITHUB_REPO}/releases`,
            downloadUrl: `https://github.com/${GITHUB_REPO}/releases`,
            hasUpdate: false,
          });
          return;
        }
        throw new Error('Failed to fetch latest release');
      }

      const data = await res.json();
      const latestTag = data.tag_name || '';
      const latestVer = latestTag.replace(/^v/, '');

      // Compare versions (semver-like comparison)
      const currentParts = CURRENT_VERSION.split('.').map(Number);
      const latestParts = latestVer.split('.').map(Number);

      let isNewer = false;
      for (let i = 0; i < 3; i++) {
        const cur = currentParts[i] || 0;
        const lat = latestParts[i] || 0;
        if (lat > cur) {
          isNewer = true;
          break;
        }
        if (lat < cur) {
          break;
        }
      }

      const exeAsset = (data.assets || []).find((a: any) =>
        a.name.endsWith('.exe') && !a.name.includes('blockmap')
      );

      const downloadUrl = exeAsset ? exeAsset.browser_download_url : data.html_url;

      setReleaseInfo({
        tagName: latestTag,
        version: latestVer,
        name: data.name || latestTag,
        body: data.body || '',
        publishedAt: data.published_at,
        htmlUrl: data.html_url,
        downloadUrl,
        hasUpdate: isNewer,
      });

      setLastChecked(new Date());
    } catch (err) {
      console.warn('[UpdateChecker] Could not check for updates:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check on startup
    checkForUpdates();

    // Check periodically every 2 hours
    const interval = setInterval(() => checkForUpdates(), 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    currentVersion: CURRENT_VERSION,
    releaseInfo,
    isChecking,
    lastChecked,
    dismissedVersion,
    setDismissedVersion,
    checkForUpdates,
  };
}

export const UpdateNotificationBanner: React.FC<{
  releaseInfo: ReleaseInfo | null;
  dismissedVersion: string | null;
  onDismiss: (ver: string) => void;
}> = ({ releaseInfo, dismissedVersion, onDismiss }) => {
  if (!releaseInfo || !releaseInfo.hasUpdate) return null;
  if (dismissedVersion === releaseInfo.version) return null;

  const handleDownload = () => {
    if (releaseInfo.downloadUrl) {
      window.open(releaseInfo.downloadUrl, '_blank');
    } else {
      window.open(releaseInfo.htmlUrl, '_blank');
    }
  };

  return (
    <div className="bg-gradient-to-r from-saffron-600 via-saffron-500 to-amber-500 text-slate-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold shadow-md select-none animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
        </span>
        <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          New Update Available: <strong>{releaseInfo.tagName}</strong> (Current: v{CURRENT_VERSION})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="px-3 py-1 rounded-lg bg-slate-950 text-white hover:bg-slate-900 active:scale-95 text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-saffron-400" />
          <span>Download Update (.exe)</span>
        </button>

        <button
          onClick={() => onDismiss(releaseInfo.version)}
          className="p-1 rounded-md hover:bg-black/10 text-slate-900 transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
