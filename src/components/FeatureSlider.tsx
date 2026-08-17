// FeatureSlider — único componente React del sitio (island con estado)
// Se monta con client:visible en platform.astro
import { useState } from 'react';
import type { Feature } from '../data/features';

interface FeatureSliderProps {
  features: Feature[];
}

export default function FeatureSlider({ features }: FeatureSliderProps) {
  const [active, setActive] = useState(0);
  const f = features[active];

  return (
    <section className="tight">
      <div className="wrap">
        <div className="feature-tabs" id="featureTabs">
          {features.map((feat, i) => (
            <button
              key={feat.title}
              className={`feature-tab${active === i ? ' active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="num">0{i + 1}</span>
              {feat.title}
            </button>
          ))}
        </div>
        <div className="feature-panel">
          <div className="feature-copy">
            <h3>{f.title}</h3>
            <p>{f.copy}</p>
          </div>
          <div className="feature-visual">
            <div className="card flat">
              <div className="card-label">
                <span>{f.card.label}</span>
                <span>●</span>
              </div>
              {f.card.lines.map((line) => (
                <div key={line} className="card-line">
                  <span className="dot"></span>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
