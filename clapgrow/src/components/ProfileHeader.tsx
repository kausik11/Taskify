import React from "react";

interface ProfileHeaderProps {
  logoSrc: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ logoSrc }) => (
	<header className="bg-[#75CBFF] w-full min-h-[20vh] rounded-xl flex items-end justify-end px-4 py-3 z-[1]">
		<img
			src={logoSrc}
			alt="Clapgrow Logo"
			className="w-[90px] h-[30px] object-contain"
		/>
	</header>
);
