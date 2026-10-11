import { DEFAULT_PROFILES } from './core/defaults';
import { sizing } from './core/sizing';

export default function App() {
  const profile = DEFAULT_PROFILES.find((item) => item.hookMm === 4);
  if (!profile) throw new Error('No se encontró el perfil de ejemplo.');
  const result = sizing(profile, 40, 40);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

  return (
    <main>
      <p className="eyebrow">TAPESTRY CROCHET · BASE DEL PROYECTO</p>
      <h1>Punto a punto</h1>
      <p className="intro">Calcula el tamaño de tu tejido a partir de una muestra.</p>
      <section aria-labelledby="example-title">
        <h2 id="example-title">Una pieza de 40 × 40 cm</h2>
        <p>{profile.name}</p>
        <p className="result">{result.cols} puntos × {result.rows} filas</p>
        <p>Tamaño real: {format.format(result.realWidthCm)} × {format.format(result.realHeightCm)} cm.</p>
        <p className="note">Este perfil es una estimación. Reemplázalo con una muestra propia para ajustar los cálculos a tu hilo y tu aguja.</p>
      </section>
    </main>
  );
}
