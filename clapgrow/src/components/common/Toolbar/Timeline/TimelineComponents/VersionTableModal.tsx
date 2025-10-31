import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const VersionTableModal = ({
	data,
	isOpen,
	onClose,
}: {
  data: string;
  isOpen: boolean;
  onClose: VoidFunction;
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-6xl p-0">
				<VersionTableContent data={data} onClose={onClose} />
			</DialogContent>
		</Dialog>
	);
};

export const VersionTableContent = ({
	data,
	onClose,
}: {
  data: string;
  onClose: VoidFunction;
}) => {
	const jsonData = JSON.parse(data);

	return (
		<>
			<DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-2 border-b">
				<DialogTitle>Changes</DialogTitle>
				<DialogClose />
			</DialogHeader>
			<ScrollArea className="min-h-[50vh] max-h-[70vh] px-6 py-4">
				<div className="flex flex-col gap-6">
					<ValueChangedTable data={jsonData.changed} />
					<AddedOrRemovedTable
						data={jsonData.added}
						title="Rows Added"
						colorClass="bg-green-50"
					/>
					<AddedOrRemovedTable
						data={jsonData.removed}
						title="Rows Removed"
						colorClass="bg-red-50"
					/>
					<RowValuesChangedTable data={jsonData.row_changed} />
				</div>
			</ScrollArea>
		</>
	);
};

export const AddedOrRemovedTable = ({
	data,
	title,
	colorClass,
}: {
  data: any[];
  title: string;
  colorClass: string;
}) => {
	if (data && data.length > 0) {
		return (
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">{title}</span>
				<div className="border border-gray-200 rounded-md overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-gray-50">
								<th className="w-1/3 px-2 py-1 text-left font-semibold">
                  Property
								</th>
								<th className="px-2 py-1 text-left font-semibold">{title}</th>
							</tr>
						</thead>
						<tbody>
							{data.map((item, index) => {
								const itemKeys = Object.keys(item[1]).sort();
								return (
									<tr key={index} className="border-t">
										<td className="w-1/3 px-2 py-1 align-top">{item[0]}</td>
										<td className={cn("px-2 py-1", colorClass)}>
											<table className="w-full text-xs">
												<tbody>
													{itemKeys.map((rowKey, idx) => (
														<tr key={idx}>
															<td className="pr-2 py-0.5">{rowKey}</td>
															{/* @ts-ignore */}
															<td className="py-0.5">{item[1][rowKey]}</td>
														</tr>
													))}
												</tbody>
											</table>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
	return null;
};

export const ValueChangedTable = ({ data }: { data: any[] }) => {
	if (data && data.length) {
		return (
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">Value Changed</span>
				<div className="border border-gray-200 rounded-md overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-gray-50">
								<th className="w-1/3 px-2 py-1 text-left font-semibold">
                  Property
								</th>
								<th className="w-1/3 px-2 py-1 text-left font-semibold">
                  Original Value
								</th>
								<th className="w-1/3 px-2 py-1 text-left font-semibold">
                  New Value
								</th>
							</tr>
						</thead>
						<tbody>
							{data.map((item, index) => (
								<tr key={index} className="border-t">
									<td className="w-1/3 px-2 py-1">{item[0]}</td>
									<td className="w-1/3 px-2 py-1 bg-red-50">{item[1]}</td>
									<td className="w-1/3 px-2 py-1 bg-green-50">
										{typeof item[2] === "object" ? (
											<pre className="bg-gray-100 rounded p-1 whitespace-pre-wrap">
												{JSON.stringify(item[2], null, 2)}
											</pre>
										) : (
											<>{item[2] ? item[2].toString() : "N/A"}</>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
	return null;
};

export const RowValuesChangedTable = ({ data }: { data: any[] }) => {
	if (data && data.length) {
		return (
			<div className="flex flex-col gap-2">
				<span className="text-sm font-medium">Row Values Changed</span>
				<div className="border border-gray-200 rounded-md overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="bg-gray-50">
								<th className="w-1/4 px-2 py-1 text-left font-semibold">
                  Table Field
								</th>
								<th className="w-1/12 px-2 py-1 text-left font-semibold">
                  Row #
								</th>
								<th className="w-1/5 px-2 py-1 text-left font-semibold">
                  Property
								</th>
								<th className="w-1/5 px-2 py-1 text-left font-semibold">
                  Original Value
								</th>
								<th className="w-1/5 px-2 py-1 text-left font-semibold">
                  New Value
								</th>
							</tr>
						</thead>
						<tbody>
							{data.map((table_info, index) =>
							// @ts-ignore
								table_info[3].map((item, subIndex) => (
									<tr key={`${index}-${subIndex}`} className="border-t">
										<td className="w-1/4 px-2 py-1">{table_info[0]}</td>
										<td className="w-1/12 px-2 py-1">{table_info[1]}</td>
										<td className="w-1/5 px-2 py-1">{item[0]}</td>
										<td className="w-1/5 px-2 py-1 bg-red-50">{item[1]}</td>
										<td className="w-1/5 px-2 py-1 bg-green-50">
											{typeof item[2] === "object" ? (
												<pre className="bg-gray-100 rounded p-1 whitespace-pre-wrap">
													{JSON.stringify(item[2], null, 2)}
												</pre>
											) : (
												item[2]
											)}
										</td>
									</tr>
								)),
							)}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
	return null;
};
