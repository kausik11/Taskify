import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = {
  onReload: VoidFunction;
};

const RefreshEventAlert = ({ onReload }: Props) => {
	return (
		<Alert variant="default" className="flex items-center gap-3">
			<Info className="h-5 w-5 text-blue-500 shrink-0" />
			<div className="flex flex-1 items-center justify-between gap-4">
				<AlertDescription className="text-sm">
          This form has been modified after you have loaded it
				</AlertDescription>
				<Button size="sm" variant="outline" onClick={onReload}>
          Refresh
				</Button>
			</div>
		</Alert>
	);
};

export default RefreshEventAlert;
