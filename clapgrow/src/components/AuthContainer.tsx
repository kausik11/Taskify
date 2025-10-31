import { Loader } from "@/layouts/Loader";
import { UserContext } from "@/utils/auth/UserProvider";
import { PropsWithChildren, useContext } from "react";
import { Link } from "react-router-dom";

const AuthContainer = ({ children }: PropsWithChildren) => {
	const { isLoading } = useContext(UserContext);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			{isLoading ? (
				<Loader size={45} speed={1.75} color="blue" />
			) : (
				<div className="w-full max-w-lg">
					<div className="w-full bg-white rounded-lg shadow dark:bg-gray-900 dark:border dark:border-gray-700 p-8">
						<Link to="/" tabIndex={-1}>
							<div className="flex justify-center mb-6">
								<span className="text-3xl font-bold cal-sans">
									<span className="text-cyan-600">Clap</span>grow
								</span>
							</div>
						</Link>
						{children}
					</div>
				</div>
			)}
		</div>
	);
};

export default AuthContainer;
