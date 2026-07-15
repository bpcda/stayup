import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const AdminPageHeader = ({ title, description, actions }: Props) => {
  return (
    <div className="mb-5 sm:mb-8">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-xs text-[#8A8A8A] hover:text-white transition-colors mb-3 sm:mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="text-sm text-[#8A8A8A] mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex w-full gap-2 shrink-0 sm:w-auto">{actions}</div>}
      </div>
    </div>
  );
};

export default AdminPageHeader;
