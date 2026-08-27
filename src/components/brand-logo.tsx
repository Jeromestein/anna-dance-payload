import Image from "next/image";

export function BrandLogo() {
  return (
    <>
      <span className="wordmark-logo" aria-hidden="true">
        <Image
          src="/images/branding/anna-dance-academy-mark.png"
          alt=""
          width={360}
          height={360}
        />
      </span>
      <span className="wordmark-text">
        <span className="wordmark-primary">Anna Dance</span>
        <span className="wordmark-secondary" aria-hidden="true">
          <span>A</span>
          <span>C</span>
          <span>A</span>
          <span>D</span>
          <span>E</span>
          <span>M</span>
          <span>Y</span>
        </span>
      </span>
    </>
  );
}
