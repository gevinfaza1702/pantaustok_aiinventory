import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import {
  ScanLine, Camera, CameraOff, Search, PackagePlus,
  PackageMinus, ExternalLink, QrCode, AlertCircle,
} from 'lucide-react';
import { barcodeAPI, movementsAPI } from '../services/api';
import { useI18n } from '../i18n/i18n';
import { formatCurrency } from '../utils/formatters';
import './Scanner.css';

const SCANNER_ID = 'qr-reader-region';

export default function Scanner() {
  const { t } = useI18n();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [qtyDelta, setQtyDelta] = useState(1);

  // Tear down camera on unmount
  useEffect(() => {
    return () => { stopScan(); /* eslint-disable-next-line */ };
  }, []);

  const lookup = async (sku) => {
    setError('');
    setActionMsg('');
    setProduct(null);
    try {
      const r = await barcodeAPI.lookupBySku(sku.trim());
      setProduct(r.data);
    } catch (err) {
      setError(err.response?.status === 404 ? `${t('scan.notFound')}: ${sku}` : 'Lookup gagal');
    }
  };

  const startScan = async () => {
    setError('');
    try {
      const html5 = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5;
      setScanning(true);
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScan();
          await lookup(decodedText);
        },
        () => { /* ignore per-frame decode errors */ }
      );
    } catch (err) {
      console.error(err);
      setError('Tidak bisa mengakses kamera. Periksa izin browser.');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    const inst = scannerRef.current;
    if (inst) {
      try {
        if (inst.isScanning) await inst.stop();
        await inst.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (manualSku.trim()) lookup(manualSku);
  };

  const recordMovement = async (type) => {
    if (!product) return;
    try {
      await movementsAPI.record({
        product_id: product.id,
        movement_type: type,
        quantity: Number(qtyDelta),
        reference: 'SCAN',
        notes: `Scanner ${type}`,
        created_by: 'scanner',
      });
      // refresh product stock
      const r = await barcodeAPI.lookupBySku(product.sku);
      setProduct(r.data);
      setActionMsg(`${type === 'in' ? t('scan.stockIn') : t('scan.stockOut')} +${qtyDelta} ✓`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal mencatat pergerakan');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="scan-heading">
          <ScanLine size={22} className="scan-heading__icon" />
          <h1>{t('scan.title')}</h1>
        </div>
      </div>

      <div className="scan-layout">
        {/* Scanner column */}
        <div className="scan-panel">
          <div id={SCANNER_ID} className={`scan-region ${scanning ? 'scan-region--live' : ''}`}>
            {!scanning && (
              <div className="scan-region__placeholder">
                <Camera size={40} />
                <p>{t('scan.placeholder')}</p>
              </div>
            )}
          </div>

          <div className="scan-controls">
            {!scanning ? (
              <button className="btn btn-primary" onClick={startScan}>
                <Camera size={15} /> {t('scan.start')}
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopScan}>
                <CameraOff size={15} /> {t('scan.stop')}
              </button>
            )}
          </div>

          <form className="scan-manual" onSubmit={handleManual}>
            <input
              type="text"
              placeholder="SKU manual…"
              value={manualSku}
              onChange={(e) => setManualSku(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary"><Search size={15} /></button>
          </form>

          {error && <div className="scan-error"><AlertCircle size={15} /> {error}</div>}
        </div>

        {/* Result column */}
        <div className="scan-result">
          {!product ? (
            <div className="scan-result__empty">
              <QrCode size={44} />
              <p>Pindai atau cari produk untuk melihat detail.</p>
            </div>
          ) : (
            <div className="scan-card">
              <div className="scan-card__head">
                <span className="scan-card__sku">{product.sku}</span>
                <h2>{product.name}</h2>
                <span className="scan-card__cat">{product.category}</span>
              </div>

              <div className="scan-card__stats">
                <div><span className="scan-card__val">{product.current_stock}</span><span className="scan-card__lbl">Stok</span></div>
                <div><span className="scan-card__val">{product.min_stock}</span><span className="scan-card__lbl">Min</span></div>
                <div><span className="scan-card__val">{formatCurrency(product.sell_price)}</span><span className="scan-card__lbl">Harga Jual</span></div>
              </div>

              {actionMsg && <div className="scan-card__msg">{actionMsg}</div>}

              <div className="scan-card__qty">
                <label>Qty</label>
                <input type="number" min="1" value={qtyDelta} onChange={(e) => setQtyDelta(e.target.value)} />
              </div>

              <div className="scan-card__actions">
                <button className="btn btn-primary" onClick={() => recordMovement('in')}>
                  <PackagePlus size={15} /> {t('scan.stockIn')}
                </button>
                <button className="btn btn-secondary" onClick={() => recordMovement('out')}>
                  <PackageMinus size={15} /> {t('scan.stockOut')}
                </button>
              </div>

              <div className="scan-card__links">
                <Link to={`/products/${product.id}`} className="scan-card__link">
                  <ExternalLink size={14} /> {t('scan.viewDetail')}
                </Link>
                <a href={barcodeAPI.qrLabelUrl(product.id)} target="_blank" rel="noreferrer" className="scan-card__link">
                  <QrCode size={14} /> {t('scan.printLabel')}
                </a>
              </div>

              <div className="scan-card__qrpreview">
                <img src={barcodeAPI.qrLabelUrl(product.id)} alt="QR" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
