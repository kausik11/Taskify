const exportToCSV = (period: string, data: any, name: string) => {
	const csvRows = [];
	const headers = Object.keys(data[0]);
	csvRows.push(`From:, ${period}`);
	csvRows.push("");
	csvRows.push(headers.join(","));
	
	for (const row of data) {
		const values = headers.map((header) => {
			const escaped = ("" + row[header]).replace(/"/g, '\\"');
			return `"${escaped}"`;
		});
		csvRows.push(values.join(","));
	}

	const csvString = csvRows.join("\n");
	const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.setAttribute("download", `${name}.csv`);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
};

export default exportToCSV;
