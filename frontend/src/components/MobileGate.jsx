import { Cpu } from 'lucide-react';

export default function MobileGate({ children }) {
  return (
    <>
      <div className="hidden md:contents">{children}</div>
      <div className="flex md:hidden items-center justify-center h-screen bg-bg-primary p-8">
        <div className="text-center">
          <Cpu className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">AutoPilot</h1>
          <p className="text-sm text-text-secondary">
            AutoPilot is designed for desktop use. Please open this page on a larger screen.
          </p>
        </div>
      </div>
    </>
  );
}
