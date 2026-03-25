import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Training | BuildRight 3D',
}

export default function TrainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
