import { ErrorCallout } from "@/components/common/Callouts/ErrorCallouts";
import { FrappeError } from "frappe-react-sdk";
import React, { useMemo } from "react";

interface ErrorBannerProps {
  error?: FrappeError | null;
  overrideHeading?: string;
  children?: React.ReactNode;
}

interface ParsedErrorMessage {
  message: string;
  title?: string;
  indicator?: string;
}

const getErrorMessages = (error?: FrappeError | null): ParsedErrorMessage[] => {
	if (!error) return [];

	let eMessages: ParsedErrorMessage[] = error._server_messages
		? JSON.parse(error._server_messages)
		: [];
	eMessages = eMessages.map((m: any) => {
		try {
			return JSON.parse(m);
		} catch {
			return m;
		}
	});

	if (eMessages.length === 0) {
		const indexOfFirstColon = error.exception?.indexOf(":");
		if (indexOfFirstColon !== -1) {
			const exception = error.exception?.slice(indexOfFirstColon + 1);
			if (exception) {
				eMessages = [{ message: exception, title: "Error" }];
			}
		}

		if (eMessages.length === 0) {
			eMessages = [
				{ message: error.message, title: "Error", indicator: "red" },
			];
		}
	}

	return eMessages;
};

export const ErrorBanner = ({
	error,
	overrideHeading,
	children,
}: ErrorBannerProps) => {
	const messages = useMemo(() => getErrorMessages(error), [error]);

	if (messages.length === 0 || !error) return null;

	return (
		<ErrorCallout>
			{messages.map((m, i) => (
				<div
					key={i}
					className="text-red-600"
					dangerouslySetInnerHTML={{ __html: m.message }}
				/>
			))}
			{children}
		</ErrorCallout>
	);
};
