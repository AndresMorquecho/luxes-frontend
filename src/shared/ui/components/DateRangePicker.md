# DateRangePicker Component

Componente reutilizable para seleccionar un rango de fechas con un calendario interactivo.

## Características

- ✅ Calendario visual para selección de fechas
- ✅ Selección de rango (desde - hasta)
- ✅ Diseño minimalista y limpio
- ✅ Navegación entre meses
- ✅ Cierre automático al hacer clic fuera
- ✅ Resaltado visual del rango seleccionado
- ✅ Botones "Limpiar" y "Aplicar"
- ✅ Formato de fecha en español (DD/MM/AA)

## Uso

```jsx
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker';

function MyComponent() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  return (
    <DateRangePicker
      value={dateRange}
      onChange={setDateRange}
      placeholder="Seleccionar rango"
    />
  );
}
```

## Props

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| `value` | `{ start: string, end: string }` | Sí | - | Objeto con las fechas seleccionadas en formato YYYY-MM-DD |
| `onChange` | `(value: { start: string, end: string }) => void` | Sí | - | Función callback que se ejecuta al aplicar el rango |
| `placeholder` | `string` | No | `'Seleccionar fechas'` | Texto que se muestra cuando no hay fechas seleccionadas |
| `className` | `string` | No | `''` | Clases CSS adicionales para el contenedor |

## Ejemplo de valor

```javascript
{
  start: '2026-06-09',  // Formato: YYYY-MM-DD
  end: '2026-06-20'     // Formato: YYYY-MM-DD
}
```

## Comportamiento

1. **Primera selección**: Al hacer clic en una fecha, se selecciona como fecha de inicio
2. **Segunda selección**: Al hacer clic en otra fecha, se completa el rango
3. **Rango inverso**: Si la segunda fecha es anterior a la primera, se intercambian automáticamente
4. **Resetear**: Al tener un rango completo y hacer clic en una nueva fecha, se reinicia la selección
5. **Aplicar**: El botón "Aplicar" está deshabilitado hasta que se seleccionen ambas fechas
6. **Limpiar**: Borra ambas fechas y cierra el calendario

## Estilos visuales

- **Fecha de inicio**: Fondo azul (`bg-blue-600`) con texto blanco
- **Fecha de fin**: Fondo azul (`bg-blue-600`) con texto blanco
- **Fechas en el rango**: Fondo azul claro (`bg-blue-50`) con texto azul
- **Fechas fuera del rango**: Texto gris con hover gris claro

## Integración con filtros

```javascript
// En el componente padre
const [dateRange, setDateRange] = useState({ start: '', end: '' });

// Al hacer la petición al backend
const filters = {
  fechaDesde: dateRange.start,
  fechaHasta: dateRange.end,
  // ... otros filtros
};

// Limpiar filtros
const limpiarFiltros = () => {
  setDateRange({ start: '', end: '' });
};
```

## Accesibilidad

- Los botones tienen atributo `type="button"` para evitar envíos de formulario
- El calendario se cierra al presionar fuera del componente
- Los días deshabilitados no son clicables
- Navegación clara con flechas para meses anteriores/siguientes
