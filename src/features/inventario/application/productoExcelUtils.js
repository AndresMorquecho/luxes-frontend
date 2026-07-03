import * as XLSX from 'xlsx';

/** Configuración de subtipos por sección (ids alineados con ProductoFormModal) */
export const SUBTIPOS_POR_CATEGORIA = {
  Taller: [
    { id: 'herramienta', label: 'Herramienta / Equipo' },
    { id: 'consumible_registro', label: 'Consumible (solo registro)' },
  ],
  Oficina: [
    { id: 'activo_fijo', label: 'Activo fijo' },
  ],
  Impresión: [
    { id: 'consumible_descargable', label: 'Material descargable (rollos/lonas)' },
    { id: 'consumible_registro', label: 'Material no rastreable (tintas)' },
  ],
};

const SUBTIPO_DEFAULTS = {
  herramienta: { descargaStock: false, esPrestable: true, tipo: 'herramienta' },
  consumible_descargable: { descargaStock: true, esPrestable: false, tipo: 'consumible' },
  consumible_registro: { descargaStock: false, esPrestable: false, tipo: 'consumible' },
  activo_fijo: { descargaStock: false, esPrestable: false, tipo: 'consumible' },
};

const COLUMN_HEADERS = [
  'subtipo',
  'nombre',
  'cantidad',
  'unidad',
  'precio_costo',
  'stock_minimo',
  'codigo',
  'marca',
  'modelo',
  'serie',
  'estado_uso',
  'responsable',
];

const EXAMPLE_ROWS = {
  Taller: [
    ['Herramienta / Equipo', 'Taladro percutor 18V', 1, 'unidades', 85, '', 'HER-001', 'Bosch', 'GSB 18V', '', 'BODEGA', ''],
    ['Consumible (solo registro)', 'Tornillos autoperforantes', 500, 'unidades', 12.5, '', '', '', '', '', '', ''],
  ],
  Oficina: [
    ['Activo fijo', 'Silla ergonómica giratoria', 4, 'unidades', 120, '', 'OFI-001', 'ErgoMax', 'Pro 300', '', 'BODEGA', ''],
    ['Activo fijo', 'Monitor 27" IPS', 2, 'unidades', 280, '', 'OFI-002', 'LG', '27UP850', 'SN-998877', 'EN USO', 'Administración'],
  ],
  Impresión: [
    ['Material descargable (rollos/lonas)', 'Rollo Vinil Mate 1.2m', 50, 'metros', 2.5, 10, '', '', '', '', '', ''],
    ['Material no rastreable (tintas)', 'Tinta Cyan 1 litro', 5, 'litro', 45, '', '', '', '', '', '', ''],
  ],
};

const INSTRUCTIONS = {
  Taller: [
    ['Plantilla de importación — Taller'],
    [''],
    ['Columnas obligatorias: subtipo, nombre, cantidad, unidad'],
    [''],
    ['Valores válidos para "subtipo":'],
    ['  • Herramienta / Equipo'],
    ['  • Consumible (solo registro)'],
    [''],
    ['Notas:'],
    ['  • "cantidad" = stock inicial (herramientas) o cantidad referencial (consumibles)'],
    ['  • Para herramientas puede usar: codigo, marca, modelo, serie, estado_uso, responsable'],
    ['  • estado_uso: BODEGA | EN USO | NO SIRVE | EN REPARACION'],
    ['  • "unidad" acepta nombre o abreviación registrada en el sistema (ej: unidades, metros)'],
    ['  • Elimine las filas de ejemplo antes de importar, o edítelas con sus datos'],
  ],
  Oficina: [
    ['Plantilla de importación — Oficina'],
    [''],
    ['Columnas obligatorias: subtipo, nombre, cantidad, unidad'],
    [''],
    ['Valores válidos para "subtipo":'],
    ['  • Activo fijo'],
    [''],
    ['Notas:'],
    ['  • Use codigo, marca, modelo, serie para identificar activos patrimoniales'],
    ['  • estado_uso: BODEGA | EN USO | NO SIRVE | EN REPARACION'],
    ['  • Elimine las filas de ejemplo antes de importar, o edítelas con sus datos'],
  ],
  Impresión: [
    ['Plantilla de importación — Impresión'],
    [''],
    ['Columnas obligatorias: subtipo, nombre, cantidad, unidad'],
    [''],
    ['Valores válidos para "subtipo":'],
    ['  • Material descargable (rollos/lonas) — descuenta stock por metraje'],
    ['  • Material no rastreable (tintas) — solo registro, no descarga stock'],
    [''],
    ['Notas:'],
    ['  • "stock_minimo" aplica solo a materiales descargables (rollos/lonas)'],
    ['  • Elimine las filas de ejemplo antes de importar, o edítelas con sus datos'],
  ],
};

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildSubtipoLookup(categoria) {
  const subs = SUBTIPOS_POR_CATEGORIA[categoria] || [];
  const map = new Map();
  subs.forEach(({ id, label }) => {
    map.set(normalizeKey(id), id);
    map.set(normalizeKey(label), id);
  });
  return map;
}

function findUnidad(unidades, raw) {
  const key = normalizeKey(raw);
  if (!key) return null;
  return unidades.find(u =>
    normalizeKey(u.nombre) === key ||
    normalizeKey(u.abreviacion) === key ||
    normalizeKey(`${u.nombre} (${u.abreviacion})`) === key
  ) || null;
}

function resolveSubtipoId(categoria, raw) {
  const lookup = buildSubtipoLookup(categoria);
  return lookup.get(normalizeKey(raw)) || null;
}

/** Descarga plantilla Excel según la sección seleccionada */
export function downloadProductoTemplate(categoria) {
  const examples = EXAMPLE_ROWS[categoria] || [];
  const dataRows = examples.map(row => {
    const obj = {};
    COLUMN_HEADERS.forEach((col, i) => { obj[col] = row[i] ?? ''; });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(dataRows, { header: COLUMN_HEADERS });
  ws['!cols'] = [
    { wch: 36 }, { wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 14 }, { wch: 18 },
  ];

  const wsInst = XLSX.utils.aoa_to_sheet(INSTRUCTIONS[categoria] || []);
  wsInst['!cols'] = [{ wch: 72 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  const slug = categoria.toLowerCase().replace(/[^a-z0-9]+/gi, '_');
  XLSX.writeFile(wb, `plantilla_inventario_${slug}.xlsx`);
}

function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? '';
  });
  return obj;
}

function detectHeaders(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) return { headers: [], dataStart: 0 };

  const first = rows[0].map(c => normalizeKey(c));
  const hasSubtipo = first.includes('subtipo');
  const hasNombre = first.includes('nombre');

  if (hasSubtipo && hasNombre) {
    return {
      headers: rows[0].map(c => normalizeKey(c)),
      dataStart: 1,
      rawRows: rows,
    };
  }

  return {
    headers: COLUMN_HEADERS.map(normalizeKey),
    dataStart: 0,
    rawRows: rows,
  };
}

/** Parsea archivo Excel y devuelve filas validadas listas para crear materiales */
export async function parseProductoExcel(file, categoria, unidades) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find(n => normalizeKey(n) === 'productos') || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const { headers, dataStart, rawRows } = detectHeaders(sheet);

  const parsed = [];
  const errors = [];

  for (let i = dataStart; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.every(cell => String(cell ?? '').trim() === '')) continue;

    const obj = rowToObject(row, headers);
    const lineNum = i + 1;
    const nombre = String(obj.nombre ?? obj['nombre'] ?? '').trim();
    const subtipoRaw = String(obj.subtipo ?? obj['subtipo'] ?? '').trim();

    if (!nombre && !subtipoRaw) continue;

    const rowErrors = [];

    if (!nombre) rowErrors.push('nombre es obligatorio');
    if (!subtipoRaw) rowErrors.push('subtipo es obligatorio');

    const subtipoId = subtipoRaw ? resolveSubtipoId(categoria, subtipoRaw) : null;
    if (subtipoRaw && !subtipoId) {
      const valid = (SUBTIPOS_POR_CATEGORIA[categoria] || []).map(s => s.label).join(' | ');
      rowErrors.push(`subtipo inválido. Use: ${valid}`);
    }

    const unidadRaw = String(obj.unidad ?? obj['unidad'] ?? '').trim();
    const unidad = findUnidad(unidades, unidadRaw);
    if (!unidadRaw) rowErrors.push('unidad es obligatoria');
    else if (!unidad) rowErrors.push(`unidad "${unidadRaw}" no encontrada en el sistema`);

    const cantidad = parseFloat(obj.cantidad ?? obj['cantidad'] ?? 0);
    if (Number.isNaN(cantidad) || cantidad < 0) rowErrors.push('cantidad debe ser un número ≥ 0');

    const precioCosto = parseFloat(obj.precio_costo ?? obj['precio costo'] ?? obj['precio_costo'] ?? 0);
    if (Number.isNaN(precioCosto) || precioCosto < 0) rowErrors.push('precio_costo debe ser un número ≥ 0');

    const stockMinimo = parseFloat(obj.stock_minimo ?? obj['stock minimo'] ?? obj['stock_minimo'] ?? 0);
    const defaults = subtipoId ? SUBTIPO_DEFAULTS[subtipoId] : null;
    const showHerramientaFields = subtipoId === 'herramienta' || subtipoId === 'activo_fijo';

    if (rowErrors.length) {
      errors.push({ line: lineNum, nombre: nombre || '(sin nombre)', messages: rowErrors });
      continue;
    }

    const payload = {
      nombre,
      tipo: defaults.tipo,
      subtipo: subtipoId,
      descargaStock: defaults.descargaStock,
      esPrestable: defaults.esPrestable,
      categoria,
      stockActual: cantidad,
      stockMinimo: defaults.descargaStock ? (Number.isNaN(stockMinimo) ? 0 : stockMinimo) : 0,
      precioCosto: Number.isNaN(precioCosto) ? 0 : precioCosto,
      unidadMedidaId: unidad.id,
      unidadMedida: unidad.nombre,
    };

    if (showHerramientaFields) {
      const codigo = String(obj.codigo ?? '').trim();
      const marca = String(obj.marca ?? '').trim();
      const modelo = String(obj.modelo ?? '').trim();
      const serie = String(obj.serie ?? '').trim();
      const estadoUso = String(obj.estado_uso ?? obj['estado uso'] ?? 'BODEGA').trim().toUpperCase() || 'BODEGA';
      const aCargo = String(obj.responsable ?? obj['a cargo'] ?? '').trim();

      if (codigo) payload.codigo = codigo;
      if (marca) payload.marca = marca;
      if (modelo) payload.modelo = modelo;
      if (serie) payload.serie = serie;
      payload.estadoUso = estadoUso;
      if (aCargo && estadoUso !== 'BODEGA') payload.aCargo = aCargo;
    }

    parsed.push({ line: lineNum, nombre, payload });
  }

  return { rows: parsed, errors };
}
