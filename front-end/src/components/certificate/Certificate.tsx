import { motion } from "framer-motion";
import { Signature } from "./Signature";

export type CertificateProps = {
  userName: string;
  courseTitle: string;
  issuedDate: string;
  certId: string;
  className?: string;
  animate?: boolean;
};

export function Certificate({
  userName,
  courseTitle,
  issuedDate,
  certId,
  className = "",
  animate = true,
}: CertificateProps) {
  const content = (
    <div
      className={`relative w-full max-w-[1000px] bg-white rounded-xl shadow-2xl overflow-hidden ${className}`}
    >
      {/* Subtle Inner Frames */}
      <div className="absolute inset-4 md:inset-8 border border-slate-200 rounded-lg pointer-events-none" />
      <div className="absolute inset-[20px] md:inset-[36px] border border-slate-100 rounded pointer-events-none" />

      <div className="p-10 md:p-20 flex flex-col min-h-[650px] md:min-h-[700px]">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 md:mb-24 gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/cbs-logo-icon-pdf.png"
              alt="CBS Icon"
              className="w-8 h-8 object-contain rounded"
            />
            <h1 className="text-navy font-semibold tracking-wide text-lg">CBS Staff LMS</h1>
          </div>
          <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
            <span className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
              Course Certificate
            </span>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center items-center text-center max-w-3xl mx-auto w-full">
          <p className="text-sm font-medium text-slate-400 mb-6 tracking-wider uppercase">
            {issuedDate}
          </p>

          <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl text-slate-900 mb-8 leading-tight">
            {userName}
          </h2>

          <p className="text-slate-500 italic font-serif text-xl mb-8">has successfully completed</p>

          <h3 className="font-serif text-3xl md:text-4xl text-navy font-medium mb-6">
            {courseTitle}
          </h3>

          <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed">
            an online course authorized by CBS and offered through the CBS Staff LMS
          </p>
        </main>

        <footer className="mt-16 md:mt-24">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 md:gap-0 border-b border-slate-100 pb-12 mb-8">
            <div className="flex flex-col items-start w-full md:w-64">
              <div className="h-16 w-48 mb-2 relative">
                <Signature className="absolute bottom-0 left-0 w-full h-full" />
              </div>
              <div className="w-full h-px bg-slate-300 mb-3" />
              <p className="text-slate-900 font-medium text-sm">Ahmed Mohamed Roble</p>
              <p className="text-slate-500 text-xs mt-0.5">Head of Training and Development</p>
            </div>

            <div className="flex-shrink-0 self-center md:self-end">
              <img src="/logo.png" alt="CBS Seal" className="w-60 h-auto md:w-48 object-contain" />
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-xs text-slate-400 font-mono">Certificate ID: {certId}</p>
            <p className="text-[11px] text-slate-400 max-w-2xl">
              CBS Staff LMS has confirmed the identity of this individual and their participation in
              the course.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {content}
    </motion.div>
  );
}
