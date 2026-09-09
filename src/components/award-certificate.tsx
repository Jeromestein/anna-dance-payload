'use client'

import Image from 'next/image'
import { useRef } from 'react'

const certificate = '/images/awards/yagp-chicago-2026-cloud-fae-top-12-certificate.webp'
const description = 'YAGP Chicago March 2026 certificate awarding Anna Dance Academy’s The Dance of the Cloud Fae Top 12 Small Ensemble.'

export function AwardCertificate({ compact = false }: { compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button className={compact ? 'award-certificate-link' : 'award-certificate-card'} type="button" onClick={() => dialog.current?.showModal()} aria-label="View YAGP Chicago 2026 award certificate">
        {compact ? 'View certificate ↗' : (
          <>
            <Image src={certificate} alt="YAGP award certificate thumbnail" width={100} height={77} />
            <span><strong>YAGP Chicago 2026 · Top 12 Small Ensemble</strong><em>The Dance of the Cloud Fae</em><span className="award-recognition-note">Anna’s original choreography has been recognized at Youth America Grand Prix (YAGP), with her students earning a Regional Top 12 placement in the Small Ensemble category.</span><small>View certificate ↗</small></span>
          </>
        )}
      </button>
      <dialog ref={dialog} className="award-certificate-dialog" aria-label="YAGP Chicago 2026 award certificate" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }}>
        <div className="award-certificate-toolbar"><span>YAGP Chicago · March 2026</span><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close award certificate">Close ×</button></div>
        <Image src={certificate} alt={description} width={1290} height={994} sizes="95vw" />
      </dialog>
    </>
  )
}
