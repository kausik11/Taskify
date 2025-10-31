import { Filter, useFrappeGetCall } from "frappe-react-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import 'ag-grid-community/styles/ag-grid.css';
// import 'ag-grid-community/styles/ag-theme-alpine.css';
import { CustomFilterProps, useGridFilter } from "ag-grid-react";
import { useDebounce } from "@/hooks/useDebounce";

export interface DropdownOption {
  value: string;
  label: string;
}

interface LinkFilterProps extends CustomFilterProps {
  doctype: string;
  filters?: Filter[];
  label?: string;
  showValueAsLabel?: boolean;
  getDropdownObjectFromValue?: (value: string) => DropdownOption;
}

export const LinkFilters = (props: LinkFilterProps) => {
	const refInput = useRef<HTMLInputElement>(null);

	// Initialize state based on props.model
	const [value, setValue] = useState<any>(props?.model?.filter || undefined);

	const doesFilterPass = useCallback(
		(params: any) => {
			const { column } = props;
			const { node } = params;

			let passed = true;
			if (value) {
				value.forEach((filterWord: string) => {
					const filterValue = props.getValue(node, column);

					if (filterValue !== undefined && filterValue !== null) {
						if (filterValue.toString().toLowerCase().indexOf(filterWord) < 0) {
							passed = false;
						}
					}
				});
			}

			return passed;
		},
		[value, props],
	);

	const getModelAsString = useCallback((model: any) => {
		if (model && model.filter) {
			return model.filter.join(", ");
		}
		return "";
	}, []);

	const afterGuiAttached = useCallback(
		(params: any) => {
			if (!params || !params.suppressFocus) {
				refInput.current?.focus();
			}
		},
		[refInput],
	);

	useGridFilter({
		doesFilterPass,
		afterGuiAttached,
		getModelAsString,
	});

	const [text, setText] = useState<string>("");
	const debounceText = useDebounce(text, 200);

	const { doctype, showValueAsLabel, filters, label } = props;

	const { data, isLoading } = useFrappeGetCall<{ message: DropdownOption[] }>(
		"frappe.desk.search.search_link",
		{
			doctype: doctype,
			txt: debounceText,
			filters: filters ? JSON.stringify(filters) : undefined,
			page_length: 20,
		},
		undefined,
		{
			revalidateOnFocus: false,
			revalidateIfStale: false,
		},
	);

	const searchResults: DropdownOption[] = useMemo(() => {
		if (data && data.message) {
			return data.message.map((r: any) => ({
				value: r.value,
				label: r.description,
			})) as DropdownOption[];
		}
		return [] as DropdownOption[];
	}, [data, showValueAsLabel]);

	const onCheckboxChange = (option: DropdownOption) => {
		if (option) {
			setValue((model: string[] | undefined) => {
				if (model?.includes(option.value)) {
					return model.filter((v) => v !== option.value);
				} else {
					return [...(model ?? []), option.value];
				}
			});
		} else {
			setValue(undefined);
		}
	};

	useEffect(() => {
		if (value && value.length > 0) {
			const model = {
				filterType: "link",
				filter: value,
				type: value.length > 1 ? "in" : "equals",
			};
			props.onModelChange(model);
		} else if (value && value.length === 0) {
			props.onModelChange(null);
		}
	}, [value]);

	useEffect(() => {
		if (props?.model?.filter) {
			setValue(props?.model?.filter);
		}
	}, [props?.model]);

	return (
		<div className="ag-filter">
			<div className="ag-set-filter">
				{isLoading && <div className="ag-filter-loading">Loading...</div>}
				<div
					role="presentation"
					className="ag-mini-filter ag-labeled ag-label-align-left ag-text-field ag-input-field"
				>
					<div
						className="ag-input-field-label ag-label ag-hidden ag-text-field-label"
						aria-hidden="true"
						role="presentation"
					></div>
					<div
						className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper"
						role="presentation"
						style={{
							display: "flex",
							flex: "auto",
							alignItems: "center",
							lineHeight: "2",
							position: "relative",
						}}
					>
						<input
							ref={refInput}
							className="ag-input-field-input ag-filter-filter"
							autoFocus
							type="text"
							placeholder={`Search ${label ?? doctype}...`}
							onChange={(e) => setText(e.target.value)}
						/>
					</div>
				</div>
				{searchResults.length === 0 && (
					<div className="ag-filter-no-matches">No matches.</div>
				)}
				<div
					className="ag-filter-list"
					style={{
						maxHeight: "384px",
						flex: "auto",
					}}
				>
					<div
						className="ag-virtual-list-container"
						style={{
							margin: "8px",
							lineHeight: "1.5",
						}}
					>
						{searchResults.map((result: DropdownOption) => {
							return (
								<CheckBoxWithLabel
									key={result.value}
									result={result}
									value={value ?? []}
									onCheckboxChange={onCheckboxChange}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export const CheckBoxWithLabel = ({
	result,
	value,
	onCheckboxChange,
}: {
  result: DropdownOption;
  value: string[];
  onCheckboxChange: (option: DropdownOption) => void;
}) => {
	const isChecked = value?.includes(result.value);
	return (
		<div className="ag-filter-item">
			<div
				className="ag-set-filter-item-checkbox ag-labeled ag-label-align-right ag-checkbox ag-input-field"
				style={{ display: "flex", padding: "2px", alignItems: "flex-start" }}
			>
				<div
					className="ag-input-field-label ag-label ag-checkbox-label ag-label-ellipsis"
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-start",
						paddingLeft: "4px",
						alignItems: "flex-start",
					}}
				>
					<div style={{ fontWeight: "bold" }}>{result.value}</div>
					<div style={{ fontSize: "10px" }}>{result.label}</div>
				</div>
				<div
					className={
						"ag-wrapper ag-input-wrapper ag-checkbox-input-wrapper" +
            (value?.includes(result.value) ? " ag-checked" : "")
					}
				>
					<input
						type="checkbox"
						className="ag-input-field-input ag-checkbox-input"
						onChange={() => onCheckboxChange(result)}
						value={result.value}
						checked={isChecked}
					/>
				</div>
			</div>
		</div>
	);
};
