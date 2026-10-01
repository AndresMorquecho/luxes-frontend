import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownLeft, Archive, Package, X } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { getAnulacionPreview, anularOrden } from '../../application/comprasService';
import './AnularCompraModal.css';

const cash = n => Number(n || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
export function AnularCompraModal({ orden, cuentas, onClose, onSaved }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [debt, setDebt] = useState('conservar');
  const [refund, setRefund] = useState(false);
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [returns, setReturns] = useState({});
  const [acknowledge, setAcknowledge] = useState(false);
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    getAnulacionPreview(orden.id).then(p => { if (active) setPreview(p); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [orden.id]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const key = e => {
      if (e.key === 'Escape' && !saving.current) onClose();
      if (e.key !== 'Tab') return;
      const nodes = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')].filter(el => el.offsetParent !== null);
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);

  const selected = (preview?.materiales || []).filter(m => returns[m.materialId] !== undefined);
  const invalidStock = selected.some(m => !(Number(returns[m.materialId]) > 0) || Number(returns[m.materialId]) > m.maxDevolver);
  const invalidRefund = refund && (!account || !(Number(amount) > 0) || Number(amount) > preview?.pagado);
  const canSubmit = preview && !preview.anulacion && reason.trim().length >= 10 && confirm === preview.numero && acknowledge && !invalidStock && !invalidRefund && !busy;

  const submit = async e => {
    e.preventDefault();
    if (!canSubmit || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await anularOrden(orden.id, {
        version: preview.version, motivo: reason.trim(), confirmarNumero: confirm, deuda: debt,
        reembolso: { monto: refund ? Number(amount) : 0, metodoPagoId: refund ? account : undefined },
        devoluciones: selected.map(m => ({ materialId: m.materialId, cantidad: Number(returns[m.materialId]) })),
        aceptarSinTrazabilidad: acknowledge,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
      // A failed/stale request must be reviewed against a fresh preview, never silently retried.
      try { setPreview(await getAnulacionPreview(orden.id)); setAcknowledge(false); } catch { /* Keep error and allow reopening. */ }
    } finally { saving.current = false; setBusy(false); }
  };
  const history = preview?.anulacion;
  return <ModalPortal><div className="ac-overlay"><form ref={dialog} className="ac-dialog" role="dialog" aria-modal="true" aria-labelledby="ac-title" aria-describedby="ac-description" onSubmit={submit}>
    <header className="ac-header"><div className="ac-icon"><Archive size={22} /></div><div><p className="ac-eyebrow">CONTROL DE COMPRAS · {orden.numero}</p><h2 id="ac-title">{history ? 'Anulación registrada' : 'Eliminar mediante anulación'}</h2><p id="ac-description">La orden y sus movimientos se conservan en el historial.</p></div><button ref={closeButton} type="button" className="ac-close" onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={20} /></button></header>
    {error && <div className="ac-error" role="alert">{error}</div>}
    {!preview ? <div className="ac-loading" role="status">{error ? 'No se pudo cargar la vista previa. Cierra y vuelve a intentarlo.' : 'Consultando pagos, deuda y existencias…'}</div> : history ? <div className="ac-body ac-history">
      <h3>{history.numero}</h3><p>{history.motivo}</p><p>Registrada: {new Date(history.fecha).toLocaleString('es-EC')}</p>
      <div className="ac-summary"><span>Reembolso registrado<strong>{cash(history.reembolsoRegistrado)}</strong></span><span>Deuda conservada<strong>{cash(history.deudaRestante)}</strong></span></div>
      <h3>Inventario</h3>{history.decisiones.devoluciones.length ? history.decisiones.devoluciones.map(d => <p key={d.materialId}>{history.antes.materiales.find(m => m.materialId === d.materialId)?.nombre}: devolución de {d.cantidad}</p>) : <p>Se conservaron las existencias.</p>}
      <p>Los cheques pendientes se cancelaron. Los pagos originales se conservaron.</p>
    </div> : <div className="ac-body"><div className="ac-summary"><span>Total de la orden<strong>{cash(preview.total)}</strong></span><span>Pagado realmente<strong>{cash(preview.pagado)}</strong></span><span>Deuda pendiente<strong>{cash(preview.saldo)}</strong></span></div>
      <div className="ac-columns"><section className="ac-section"><h3><ArrowDownLeft size={18} /> Dinero y deuda</h3>
        <label className="ac-choice"><input type="checkbox" checked={refund} disabled={preview.pagado <= 0 || busy} onChange={e => setRefund(e.target.checked)} /><span>Registrar reembolso recibido<small>Solo si el proveedor ya devolvió el dinero. Aumenta el saldo de la cuenta elegida.</small></span></label>
        {refund && <div className="ac-fields"><label>Monto recibido<div className="ac-inline"><input aria-label="Monto del reembolso" type="number" min="0.01" max={preview.pagado} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /><button type="button" onClick={() => setAmount(String(preview.pagado))} disabled={busy}>Total pagado</button></div></label><label>Cuenta que recibió el dinero<select value={account} onChange={e => setAccount(e.target.value)} disabled={busy}><option value="">Selecciona una cuenta</option>{cuentas.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label></div>}
        {!refund && <p className="ac-hint">La caja no cambia. Los pagos realizados permanecen registrados; no se considera recuperado ningún dinero.</p>}
        <label className="ac-label">Deuda con el proveedor<select value={debt} onChange={e => setDebt(e.target.value)} disabled={busy}><option value="conservar">Conservar la deuda pendiente</option><option value="cancelar">Cancelar la deuda pendiente</option></select></label>
        <p className="ac-hint">{debt === 'cancelar' ? 'El saldo por pagar quedará en cero. Elige esta opción si la obligación ya no existe.' : 'La obligación sigue en Cuentas por pagar y podrá pagarse posteriormente.'}</p>
        {preview.chequesPendientes.length > 0 && <div className="ac-note"><AlertTriangle size={16} /><div>Se cancelarán {preview.chequesPendientes.length} cheques pendientes por {cash(preview.chequesPendientes.reduce((s,c)=>s+c.monto,0))}. Debes gestionar también la cancelación física/bancaria; este sistema no contacta al banco.</div></div>}
      </section><section className="ac-section"><h3><Package size={18} /> Existencias a devolver</h3><p className="ac-hint">Selecciona únicamente el material que realmente sale de bodega. Lo consumido no se repone ni se descuenta otra vez.</p>
        {preview.materiales.length === 0 && <div className="ac-empty">No hay entradas de inventario vinculadas que puedan descontarse automáticamente.</div>}
        {preview.materiales.map(m => <div className="ac-material" key={m.materialId}><label className="ac-choice"><input type="checkbox" checked={returns[m.materialId] !== undefined} disabled={busy || m.maxDevolver <= 0} onChange={e => setReturns(prev => { const next = { ...prev }; if (e.target.checked) next[m.materialId] = String(m.maxDevolver); else delete next[m.materialId]; return next; })} /><span>{m.nombre}<small>Recibido: {m.recibido} · Disponible: {m.disponible} {m.unidad}</small></span></label>{returns[m.materialId] !== undefined && <label className="ac-quantity">Devolver ({m.unidad})<input type="number" min="0.000001" step="any" max={m.maxDevolver} value={returns[m.materialId]} disabled={busy} onChange={e => setReturns(prev => ({ ...prev, [m.materialId]: e.target.value }))} /></label>}</div>)}
        {preview.sinTrazabilidad && <div className="ac-note"><AlertTriangle size={18} /><span>Hay recepciones antiguas sin un vínculo verificable. Esas existencias se conservarán y requerirán revisión manual.</span></div>}
      </section></div>
      <div className="ac-bottom-fields"><label>Motivo de la anulación<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={2000} placeholder="Explica por qué se anula y el acuerdo con el proveedor…" disabled={busy} /></label><label>Escribe {preview.numero} para confirmar<input value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off" disabled={busy} /></label></div>
      <label className="ac-choice ac-ack"><input type="checkbox" checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} disabled={busy} /><span>He revisado los efectos: ingreso a caja de {cash(refund ? amount : 0)}, deuda final de {cash(debt === 'cancelar' ? 0 : preview.saldo)} y devolución de {selected.length} materiales. Confirmo que reflejan lo ocurrido.{preview.chequesPendientes.length > 0 ? ' Se cancelarán los cheques pendientes.' : ''}{preview.sinTrazabilidad ? ' Acepto conservar sin ajuste los ítems sin trazabilidad.' : ''}</span></label>
    </div>}
    <footer className="ac-footer"><span><Archive size={15} /> Historial y responsable conservados</span><button type="button" className="ac-secondary" onClick={onClose} disabled={busy}>{history ? 'Cerrar' : 'Volver'}</button>{!history && <button type="submit" className="ac-danger" disabled={!canSubmit}>{busy ? 'Registrando…' : 'Confirmar anulación'}</button>}</footer>
  </form></div></ModalPortal>;
}
