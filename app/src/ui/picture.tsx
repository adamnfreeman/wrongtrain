/* A picture shown full screen inside the app: tickets and bookings kept as pictures (the sample's,
   for now), so they open right here instead of in another app. */
import { createPortal } from 'react-dom';

export function PictureView({ src, title, close }: { src: string; title: string; close: () => void }) {
  return createPortal(
    <div className="pview" role="dialog" aria-label={title}>
      <div className="pview-bar">
        <button className="linkbtn" onClick={close}>Close</button>
        <span>{title}</span>
        <span />
      </div>
      <div className="pview-img"><img src={src} alt={title} /></div>
    </div>,
    document.body,
  );
}
