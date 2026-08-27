type ProgramFaqProps = {
  id?: string;
};

export function ProgramFaq({ id }: ProgramFaqProps) {
  return (
    <section className="faq-section section-space" id={id}>
      <div className="page-shell faq-layout">
        <div>
          <p className="eyebrow">Program FAQ</p>
          <h2 className="display-title">What families<br /><em>should know.</em></h2>
        </div>
        <div className="faq-list">
          <details><summary>What ages do you teach?</summary><p>We welcome young dancers ages 2½ and up. Please contact us about older beginners or age-specific availability.</p></details>
          <details><summary>Are classes taught in English or Chinese?</summary><p>Instruction is available in both English and Chinese.</p></details>
          <details><summary>How long are classes and terms?</summary><p>Regular classes are 60 minutes. Level-Based Group Classes meet weekly, with approximately 10–16 lessons per term and two main terms each year. Exact dates and lesson counts are provided for each registration period.</p></details>
          <details><summary>Can my child enroll only in a competition solo or duet?</summary><p>No. Competition solo and duet coaching is available only to students concurrently enrolled in an Academy Level-Based Group Class.</p></details>
          <details><summary>Is Technique &amp; Fundamentals required?</summary><p>It is strongly recommended for competition students to support safer progress, stronger technique, and performance readiness, but it is not currently a mandatory enrollment requirement.</p></details>
        </div>
      </div>
    </section>
  );
}
