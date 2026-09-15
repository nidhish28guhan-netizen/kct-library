import React, { useEffect, useState } from 'react';
import { fetchText } from '../api';
import { Spinner } from './ui';

/** Barcode SVG loaded through the authenticated client (an <img> cannot send the JWT). */
export default function BarcodeSvg({ barcode }) {
  const [svg, setSvg] = useState(null);
  useEffect(() => {
    let alive = true;
    setSvg(null);
    fetchText(`/barcodes/${encodeURIComponent(barcode)}/svg`).then((t) => alive && setSvg(t)).catch(() => alive && setSvg(''));
    return () => { alive = false; };
  }, [barcode]);
  if (!barcode) return null;
  if (svg === null) return <Spinner label="Rendering barcode…" />;
  return <div className="barcode-slot" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`Barcode ${barcode}`} />;
}
