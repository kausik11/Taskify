import { CustomCellEditorProps } from "ag-grid-react";
import { forwardRef, useEffect, useRef } from "react";
import "./richTextEditor.css";
import ReactQuill from "react-quill";

export const TableRichTextEditor = forwardRef<
  unknown,
  CustomCellEditorProps
>((props, ref) => {
	const reactQuillRef = useRef<ReactQuill>(null);

	const formats = [
		"bold",
		"italic",
		"underline",
		"strike",
		"blockquote",
		"list",
		"bullet",
		"link",
	];

	useEffect(() => {
		if (reactQuillRef.current) {
			reactQuillRef.current.editor?.focus();
		}
	}, []);

	const onValueChange = (v: string) => {
		props.onValueChange(v);
	};

	return (
		<div className="bg-white h-[40px]">
			<ReactQuill
				className={"my-quill-editor rich-text-table-editor"}
				value={props.value}
				onChange={onValueChange}
				tabIndex={1}
				ref={reactQuillRef}
				modules={{
					toolbar: [
						["bold", "italic", "underline", "strike", "align", "direction"],
						["blockquote", "code-block"],
						[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
						[{ script: "sub" }, { script: "super" }],
						[{ indent: "-1" }, { indent: "+1" }],
						[{ size: ["small", false, "large", "huge"] }],
						[{ header: [1, 2, 3, 4, 5, 6, false] }],
						[{ color: [] }, { background: [] }],
						[{ font: [] }],
						[{ align: [] }],
						["clean"],
					],
				}}
				formats={formats}
			/>
		</div>
	);
});