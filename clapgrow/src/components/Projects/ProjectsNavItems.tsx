const DisplayProjectsTabs = ({
	title,
	value,
	selectedTab,
	changeSelectedTab,
}: {
  title: string;
  value: string;
  selectedTab: string;
  changeSelectedTab: any;
}) => {
	return (
		<div
			className="flex flex-col cursor-pointer relative"
			onClick={() => {
				changeSelectedTab(value);
			}}
		>
			<span
				className="text-[14px] pb-[9px]"
				style={{
					color: selectedTab === value ? "#0076BD" : "#5B5967",
					fontWeight: selectedTab === value ? "600" : "400",
				}}
			>
				{title}
			</span>
			{selectedTab === value ? (
				<div
					className="flex flex-1 border-[1px] rounded-[2px] absolute bottom-[-6px] left-0 right-0"
					style={{
						borderColor: "#0076BD",
					}}
				/>
			) : null}
		</div>
	);
};

export default DisplayProjectsTabs;
