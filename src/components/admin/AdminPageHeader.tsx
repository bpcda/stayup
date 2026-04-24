import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const AdminPageHeader = ({ title, description, actions }: Props) => {
  return (
    <div className="mb-8">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/admin">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
      </Button>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default AdminPageHeader;
