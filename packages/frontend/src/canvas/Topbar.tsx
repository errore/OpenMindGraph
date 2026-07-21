import { useRef, useEffect } from 'react';

interface TopbarProps {
  fileMenuOpen: boolean;
  setFileMenuOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  onClearCanvas: () => void;
  onImportMG: () => void;
  onExportMG: () => void;
}

export function Topbar({
  fileMenuOpen,
  setFileMenuOpen,
  setSettingsOpen,
  onClearCanvas,
  onImportMG,
  onExportMG,
}: TopbarProps) {
  const topBarRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Element)) {
        setFileMenuOpen(false);
      }
    };
    if (fileMenuOpen) {
      document.addEventListener('mousedown', onClick);
    }
    return () => document.removeEventListener('mousedown', onClick);
  }, [fileMenuOpen, setFileMenuOpen]);

  return (
    <div ref={topBarRef}>
      <div className="omg-topbar-inner">
        <div className="omg-topbar-left">
          <div className="omg-file-menu" ref={fileMenuRef}>
            <button
              className="omg-topbar-btn"
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
            >
              File
            </button>
            {fileMenuOpen && (
              <div className="omg-dropdown">
                <button onClick={onClearCanvas}>Clear Canvas</button>
                <button onClick={onImportMG}>Import .mg</button>
                <button onClick={onExportMG}>Export .mg</button>
              </div>
            )}
          </div>
          <button
            className="omg-topbar-btn"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
