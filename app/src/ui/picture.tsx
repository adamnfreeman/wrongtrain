/* A picture or PDF shown full screen inside the app: tickets, bookings and IDs open right here
   instead of in another app. "Save or share" hands the file to the phone when wanted. */
import { createPortal } from 'react-dom';

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
