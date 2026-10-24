/* A picture or PDF shown full screen inside the app: tickets, bookings and IDs open right here
   instead of in another app. "Save or share" hands the file to the phone when wanted. */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Doc } from '../model/types';
import { openFile, useFileUrl } from '../sync/files';

export function PictureView({ src, title, close, pdf, onShare }: { src: string; title: string; close: () => void; pdf?: boolean; onShare?: () => void }) {
  return createPortal(
    <div className="pview" role="dialog" aria-label={title}>
      <div className="pview-bar">
        <button className="linkbtn" onClick={close}>Close</button>
        <span>{title}</span>
        {onShare ? <button className="linkbtn" onClick={onShare}>Save or share</button> : <span />}
      </div>
      <div className="pview-img">{pdf ? <iframe className="pview-pdf" src={src} title={title} /> : <img src={src} alt={title} />}</div>
    </div>,
    document.body,
  );
}

/** A ticket or document that is a file, opened right here full screen (pictures and PDFs), with
    "Save or share" for the phone; anything else goes to the phone's own viewer. */
export function FileTicket({ d, close, onError }: { d: Doc; close: () => void; onError: (m: string) => void }) {
  const kind = d.file!.type.startsWith('image/') ? 'image' : d.file!.type === 'application/pdf' ? 'pdf' : '';
  const { url, missing } = useFileUrl(kind ? d.file!.path : undefined);
  const other = !kind || missing;
  const share = () => { void openFile(d.file!.path, d.file!.name).catch(e => onError((e as Error).message)); };
  useEffect(() => { if (other) void openFile(d.file!.path, d.file!.name).catch(e => onError((e as Error).message)).finally(close); }, [other]); // eslint-disable-line react-hooks/exhaustive-deps
  return !other && url ? <PictureView src={url} title={d.title} pdf={kind === 'pdf'} onShare={share} close={close} /> : null;
}
