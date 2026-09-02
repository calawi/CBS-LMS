import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Certificate } from "./Certificate";

type CertificatePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  courseTitle: string;
  issuedDate: string;
  certId: string;
};

export function CertificatePreviewDialog({
  open,
  onOpenChange,
  userName,
  courseTitle,
  issuedDate,
  certId,
}: CertificatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-5xl p-0 gap-0 border-0 bg-slate-50 overflow-y-auto max-h-[95vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Course Certificate</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 md:p-8">
          <Certificate
            userName={userName}
            courseTitle={courseTitle}
            issuedDate={issuedDate}
            certId={certId}
            animate={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
