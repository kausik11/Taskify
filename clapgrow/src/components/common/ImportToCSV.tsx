import React, { useState, useCallback } from "react";
import Papa from "papaparse";

interface CsvRow {
  [key: string]: unknown;
}

export const CsvImport: React.FC = () => {
	const [data, setData] = useState<CsvRow[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Handle file parsing using papaparse
	const parseFile = useCallback((file: File) => {
		Papa.parse<CsvRow>(file, {
			header: true, // Read headers
			skipEmptyLines: true,
			dynamicTyping: true,
			complete: (result) => {
				setData(result.data);
			},
			error: (err) => setError(err.message),
		});
	}, []);

	// Handle file change from input
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) parseFile(file);
	};

	// Handle file drop
	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file && file.type === "text/csv") {
			parseFile(file);
			setError(null);
		} else {
			setError("Please upload a valid CSV file.");
		}
	};

	// Prevent default dragover behavior
	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
		e.preventDefault();

	return (
		<div>
			<h2>CSV Import</h2>
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				style={{
					border: "2px dashed #ccc",
					padding: "20px",
					textAlign: "center",
					marginBottom: "20px",
					background: "#f9f9f9",
				}}
			>
				<p>Drag & Drop CSV file here or</p>
				<input type="file" accept=".csv" onChange={handleFileChange} />
			</div>
		</div>
	);
};