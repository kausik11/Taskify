import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Copy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getPath } from "@/hooks/useGetRouting";

export interface ToolbarBreadCrumbsProps {
  doctype: string;
  customLabel?: string;
  previousPath?: string;
  previousPage?: string;
  currentPage: string;
  extraData?: string;
}

export const ToolbarBreadCrumbs = (props: ToolbarBreadCrumbsProps) => {
	const previousPath = useGetPreviousPath(props.doctype) || props.previousPath;

	const copyCurrentPage = async () => {
		try {
			await navigator.clipboard.writeText(props.currentPage);
			toast.info(`${props.currentPage} copied to clipboard`);
		} catch (e) {
			toast.error("Failed to copy");
		}
	};

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to={previousPath || "#"}>
							{props.previousPage
								? props.previousPage
								: props.customLabel
									? props.customLabel
									: props.doctype}
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>
						<span className="flex items-center group cursor-default">
							<span className="flex items-center">
								<span className="text-sm">{props.currentPage}</span>
								{props.extraData && (
									<span className="ml-1 text-sm font-normal text-gray-600">
                    ({props.extraData})
									</span>
								)}
							</span>
							<Copy
								className="ml-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
								onClick={copyCurrentPage}
								aria-label="Copy"
							/>
						</span>
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
};
/**
 * Hook to get the previous search params from location state
 * @param doctype - Optional doctype - recommended way
 * @returns previousSearchParams
 * @example
 * const previousSearchParams = useGetPreviousPath('Stock No')
 * */
export const useGetPreviousPath = (doctype?: string) => {
	const location = useLocation();

	if (doctype) {
		let path = `${getPath(doctype)}${location.state?.previousSearchParams ?? ""}`;
		if (path) {
			return path;
		} else {
			return `/${doctype.replace(/ /g, "-").toLowerCase()}`;
		}
	}
	return `./../${location.state?.previousSearchParams ?? ""}`;
};
