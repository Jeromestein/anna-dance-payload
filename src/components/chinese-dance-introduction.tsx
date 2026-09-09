import Image from "next/image";

const classicalElements = [
  {
    title: "Core Elements",
    description: "Emphasizes the integration of hand, eye, body, technique, and form with spirit, strength, and rhythm, while focusing on inner expression, body movement, and breath.",
  },
  {
    title: "Movement Characteristics",
    description: "Features refined and expressive movements, with an emphasis on twisting, tilting, circular, and curved body lines, combining both strength and softness.",
  },
  {
    title: "Common Props",
    description: "Water sleeves, folding fans, long silk ribbons, and swords are often used to express emotion, character, and historical stories.",
  },
];

const folkStyles = [
  { title: "Han Folk Dance", description: "Includes lively styles such as Northeastern Yangge, often featuring expressive handkerchief techniques." },
  { title: "Mongolian Dance", description: "Known for bold and expansive movements, including distinctive shoulder techniques and balancing skills." },
  { title: "Tibetan Dance", description: "Features grounded steps, flowing sleeves, and rhythmic footwork that reflect the spirit of the Tibetan Plateau." },
  { title: "Uyghur Dance", description: "Characterized by an upright posture, expressive head and neck movements, and dynamic turns." },
];

export function ChineseDanceIntroduction() {
  return (
    <section className="chinese-dance-section section-space" aria-labelledby="chinese-dance-title">
      <div className="page-shell">
        <div className="chinese-dance-opening">
          <div>
            <p className="eyebrow">Discover Chinese dance</p>
            <h2 className="display-title" id="chinese-dance-title">Beautiful in Experience.<br /><em>Lasting in Growth.</em></h2>
          </div>
          <p className="lead">Chinese dance offers children far more than movement. It brings together artistry, physical training, imagination, stage presence, and cultural discovery in a learning experience that is both expressive and deeply enriching.</p>
        </div>

        <div className="dance-experience">
          <p>For many young dancers, the connection begins with something simple and immediate—</p>
          <ul className="dance-moments">
            <li><span aria-hidden="true">01</span><p>a flowing skirt opening into a turn,</p></li>
            <li><span aria-hidden="true">02</span><p>a fan unfolding in their hands,</p></li>
            <li><span aria-hidden="true">03</span><p>or a piece of music that makes them want to move.</p></li>
          </ul>
          <p>These moments of curiosity often become the beginning of something more.</p>
        </div>

        <div className="dance-growth">
          <div className="dance-growth-lines">
            <p>From interest comes <em>participation.</em></p>
            <p>From participation comes <em>confidence.</em></p>
          </div>
          <div>
            <p>And over time, dance becomes a way for children to develop discipline, self-expression, stage presence, and a deeper appreciation for culture.</p>
            <p>This is the kind of growth we hope every student carries with them—both on stage and beyond.</p>
          </div>
        </div>

        <article className="dance-tradition" aria-labelledby="classical-dance-title">
          <div className="dance-tradition-heading">
            <span className="eyebrow">01 · Classical tradition</span>
            <h3 id="classical-dance-title">Chinese Classical Dance</h3>
            <p>Chinese Classical Dance is a mature dance system developed over thousands of years of Chinese culture, drawing inspiration from traditional opera, martial arts, and other classical art forms.</p>
          </div>
          <figure className="dance-visual">
            <div className="dance-visual-scroll" role="region" aria-label="Classical dance props illustration" tabIndex={0}>
              <div className="dance-visual-canvas">
                <Image src="/images/dance-styles/classical-props-illustration.webp" alt="Illustrated water sleeves, an open folding fan, flowing silk ribbons, and a tasselled stage sword, from left to right." width={1800} height={600} sizes="(max-width: 680px) 760px, 1200px" />
                <div className="dance-visual-labels"><span>Water sleeves</span><span>Folding fan</span><span>Long silk ribbons</span><span>Stage sword</span></div>
              </div>
            </div>
            <figcaption>AI-generated illustration of common stage props.</figcaption>
          </figure>
          <dl className="classical-elements">
            {classicalElements.map((element) => (
              <div key={element.title}><dt>{element.title}</dt><dd>{element.description}</dd></div>
            ))}
          </dl>
        </article>

        <article className="dance-tradition" aria-labelledby="folk-dance-title">
          <div className="dance-tradition-heading">
            <span className="eyebrow">02 · Ethnic &amp; folk traditions</span>
            <h3 id="folk-dance-title">Chinese Ethnic &amp; Folk Dance</h3>
            <p>Chinese Ethnic &amp; Folk Dance reflects the traditions, lifestyles, and cultural characteristics of China’s many regions and ethnic groups.</p>
          </div>
          <figure className="dance-visual">
            <div className="dance-visual-scroll" role="region" aria-label="Folk dance costume illustrations" tabIndex={0}>
              <div className="dance-visual-canvas">
                <Image src="/images/dance-styles/folk-costume-illustration.webp" alt="Four illustrated dancers in Han Yangge, Mongolian-inspired, Tibetan-inspired, and Uyghur-inspired stage costumes, from left to right." width={1800} height={600} sizes="(max-width: 680px) 760px, 1200px" />
                <div className="dance-visual-labels"><span>Han Folk Dance</span><span>Mongolian Dance</span><span>Tibetan Dance</span><span>Uyghur Dance</span></div>
              </div>
            </div>
            <figcaption>AI-generated costume illustrations. Styles vary by region and choreography.</figcaption>
          </figure>
          <div className="folk-style-grid">
            {folkStyles.map((style) => (
              <div className="folk-style" key={style.title}><h4>{style.title}</h4><p>{style.description}</p></div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
