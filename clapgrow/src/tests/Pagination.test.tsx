import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import Pagination from "../components/common/Pagination";

// Mocking Chevron icons for testing
vi.mock("lucide-react", () => ({
	ChevronLeft: () => <div>ChevronLeft</div>,
	ChevronRight: () => <div>ChevronRight</div>,
}));

describe("Pagination component", () => {
	const setup = (
		currentPage: number,
		totalRecords: number,
		recordsPerPage: number,
	) => {
		const setCurrentPage = vi.fn();
		render(
			<Pagination
				setCurrentPage={setCurrentPage}
				totalRecords={totalRecords}
				recordsPerPage={recordsPerPage}
				currentPage={currentPage}
			/>,
		);
		return { setCurrentPage };
	};

	it("renders correct initial record range and total records", () => {
		setup(1, 100, 10);
		expect(screen.getByText("1 - 10 of 100")).toBeInTheDocument();
	});

	it("disables the previous button on the first page", () => {
		setup(1, 100, 10);
		const prevButton = screen.getByText("ChevronLeft").closest("button");
		expect(prevButton).toBeDisabled();
	});

	it("disables the next button on the last page", () => {
		setup(10, 100, 10);
		const nextButton = screen.getByText("ChevronRight").closest("button");
		expect(nextButton).toBeDisabled();
	});

	it("enables the next button on non-last pages", () => {
		setup(5, 100, 10);
		const nextButton = screen.getByText("ChevronRight").closest("button");
		expect(nextButton).not.toBeDisabled();
	});

	it("calls setCurrentPage when next page button is clicked", () => {
		const { setCurrentPage } = setup(1, 100, 10);
		const nextButton = screen.getByText("ChevronRight").closest("button");
		fireEvent.click(nextButton!);
		expect(setCurrentPage).toHaveBeenCalledWith(2);
	});

	it("calls setCurrentPage when previous page button is clicked", () => {
		const { setCurrentPage } = setup(2, 100, 10);
		const prevButton = screen.getByText("ChevronLeft").closest("button");
		fireEvent.click(prevButton!);
		expect(setCurrentPage).toHaveBeenCalledWith(1);
	});

	it("displays the correct page numbers and highlights the current page", () => {
		setup(3, 100, 10);
		const currentPageButton = screen.getByText("3");
		expect(currentPageButton).toHaveClass("py-1 px-3 rounded-lg bg-[#D4EFFF]");
	});

	it("calls setCurrentPage when a specific page number is clicked", () => {
		const { setCurrentPage } = setup(1, 100, 10);
		const pageButton = screen.getByText("3");
		fireEvent.click(pageButton);
		expect(setCurrentPage).toHaveBeenCalledWith(3);
	});

	it("shows the correct range of records based on current page", () => {
		setup(5, 100, 10);
		expect(screen.getByText("41 - 50 of 100")).toBeInTheDocument();
	});
});
