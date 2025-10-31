import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Cloud } from "lucide-react";

const PageNotFound = () => {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-600 to-blue-400 text-white px-4 sm:px-6 lg:px-8">
			<motion.div
				className="bg-white/10 backdrop-blur-md rounded-xl p-6 sm:p-8 lg:p-10 max-w-xs sm:max-w-sm lg:max-w-lg shadow-lg"
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.8, ease: "easeInOut" }}
			>
				<motion.div
					initial={{ opacity: 0, y: -50 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeInOut" }}
					className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-center"
				>
					404
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 50 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, ease: "easeInOut" }}
					className="text-xl sm:text-2xl lg:text-3xl font-semibold text-center mb-6"
				>
					Oops! We couldn't find that page.
				</motion.div>

				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1, y: [0, -10, 0] }}
					transition={{ duration: 1.2, ease: "easeInOut", y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
					className="mb-6 sm:mb-8 lg:mb-10 flex justify-center"
				>
					<Cloud className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 opacity-60 text-white" />
				</motion.div>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 1.5, ease: "easeInOut" }}
					className="text-base sm:text-lg lg:text-xl text-center max-w-xs sm:max-w-sm lg:max-w-md mb-6 sm:mb-8"
				>
					It seems you're floating in the clouds! Let us guide you back.
				</motion.p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button
						onClick={() => navigate(-1)}
						type="button"
						className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-base sm:text-lg font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition duration-200"
					>
						Go Back
					</Button>
				</div>
			</motion.div>
		</div>
	);
};

export default PageNotFound;