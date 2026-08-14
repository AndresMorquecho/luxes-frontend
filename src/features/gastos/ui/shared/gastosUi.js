import headerBg from '../../../../assets/header-bg.png';

export const MODAL_HEADER_STYLE = {
  backgroundColor: '#030d24',
  backgroundImage: `linear-gradient(90deg, #030d24 0%, #081d3d 50%, #030d24 100%)`,
  borderBottom: '1.5px solid rgba(200, 150, 62, 0.45)',
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

export const MODAL_FORM_STYLES = `
  .btn-primary { background: linear-gradient(135deg, #0b2d64 0%, #164e96 100%); border: 1px solid rgba(200,150,62,0.4); color: white; transition: all 0.15s ease; }
  .btn-primary:hover { background: linear-gradient(135deg, #071f45 0%, #0b2d64 100%); border-color: #c8963e; box-shadow: 0 4px 14px rgba(11,45,100,0.35); }
  .btn-ghost { transition: all 0.15s ease; }
  .btn-ghost:hover { background: #f1f5f9; }
  .input-field { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; outline: none; transition: all 0.15s ease; background: white; width: 100%; }
  .input-field:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .input-field::placeholder { color: #94a3b8; }
  @keyframes modal-in { from { transform: scale(0.95) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  .animate-modal-in { animation: modal-in 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
`;

export const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
