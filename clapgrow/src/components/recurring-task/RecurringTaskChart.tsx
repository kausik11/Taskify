import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MoveDownLeft, MoveUpRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import TrendSelector from "../common/TrendSelector";
import { FrappeConfig, FrappeContext } from "frappe-react-sdk";
import { UserContext } from "../../utils/auth/UserProvider";

export default function RecurringTaskChart(props: { isTableOpen: boolean }) {
  const { call } = useContext(FrappeContext) as FrappeConfig;
  const { companyDetails } = useContext(UserContext);
  const COLORS = ["#9397F6", "#0CA866", "#E0BF10", "#D72727"];

  const [statusData, setStatusData] = useState([
    { hex: "#9397F6", label: "Upcoming", value: 0 },
    { hex: "#0CA866", label: "Completed", value: 0 },
    { hex: "#E0BF10", label: "Due today", value: 0 },
    { hex: "#D72727", label: "Overdue", value: 0 },
  ]);

  const [trendsGraph, setTrendsGraph] = useState<string>("This Week");
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [completedPercentage, setCompletedPercentage] = useState<number>(0);
  const [changePercentage, setChangePercentage] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);

  const companyId = useMemo(() => {
    return companyDetails && companyDetails.length > 0
      ? companyDetails[0].name
      : null;
  }, [companyDetails]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const filters: { trend: string; company_id?: string } = {
          trend: trendsGraph,
        };
        if (companyId) {
          filters.company_id = companyId;
        }

        const response = await call.post(`frappe.desk.query_report.run`, {
          report_name: "Recurring Task Status",
          filters,
        });

        const resultData = response.message.result[0];
        setStatusData([
          {
            hex: "bg-[#9397F6]",
            label: "Upcoming",
            value: resultData.upcoming,
          },
          {
            hex: "bg-[#0CA866]",
            label: "Completed",
            value: resultData.completed,
          },
          {
            hex: "bg-[#E0BF10]",
            label: "Due today",
            value: resultData.due_today,
          },
          {
            hex: "bg-[#D72727]",
            label: "Overdue",
            value: resultData.overdue,
          },
        ]);

        setTotalRecords(resultData.total_tasks);
        setCompletedPercentage(resultData.completed_percentage || 0);
        setChangePercentage(resultData.change_percentage || 0);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    };

    fetchTasks();
  }, [trendsGraph, companyId, call]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (
      active &&
      payload &&
      payload.length &&
      payload[0]?.payload?.label !== undefined &&
      payload[0]?.payload?.value !== undefined
    ) {
      const { label, value } = payload[0].payload;
      return (
        <div className="bg-gray-900 p-3 rounded-lg shadow-lg border border-gray-700 transition-all duration-200">
          <p className="text-sm text-white font-medium">
            {`${label}: ${value}`}
          </p>
        </div>
      );
    }
    return null; // no tooltip if data is missing
  }, []);

  return (
    <>
      <div className="p-5 rounded-[16px] bg-white w-full h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h1 className="font-inter font-semibold text-[16px] leading-[100%] tracking-[0]">Recurring Task</h1>
          <TrendSelector
            value={trendsGraph}
            onChange={setTrendsGraph}
            pageName=""
          />
        </div>

        {isMounted && (
          <div className="flex-grow flex flex-col">
            {changePercentage >= 0 ? (
              <div className="flex items-center justify-center gap-2 bg-[#EEFDF1] w-full py-1.5 rounded-xl text-[#5B5967] text-[12px] mb-3">
                <MoveUpRight
                  className="text-emerald-500 p-1 rounded-full bg-[#D0F2D7]"
                  size={23}
                />
                {/* <span className="font-semibold text-emerald-500">
									Up {Math.abs(changePercentage)}%
								</span> */}
                <span className="font-semibold text-emerald-500">
                  Up{" "}
                  {Number.isInteger(Math.abs(changePercentage))
                    ? Math.abs(changePercentage).toFixed(0)
                    : Math.abs(changePercentage).toFixed(2)} 
                  %
                </span>
                <span className="text-[#5B5967] font-normal">
                  from previous week
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-[#f5e6e5] w-full py-1.5 rounded-xl text-[#5B5967] text-[12px] mb-3">
                <MoveDownLeft
                  className="text-red-500 p-1 rounded-full bg-[#f0d0c6]"
                  size={23}
                />
                <span className="font-[600] text-red-500">
                  Down{""}  {Number.isInteger(Math.abs(changePercentage))
                    ? Math.abs(changePercentage).toFixed(0)
                    : Math.abs(changePercentage).toFixed(2)} 
                  %
                </span>
                <span className="text-[#5B5967] font-[400]">
                  from previous week
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between xl:justify-center gap-8 flex-grow">
              <div className="relative w-[169px] h-[169px] ml-5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius="76%"
                      outerRadius="100%"
                      startAngle={-90}
                      endAngle={270}
                      fill="#F3F4F6"
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    />
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius="80%"
                      outerRadius="96%"
                      cornerRadius={40}
                      startAngle={-90}
                      endAngle={270}
                      paddingAngle={1}
                      dataKey="value"
                      animationBegin={100}
                      animationDuration={800}
                    >
                      {statusData.map((_, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip />}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center text-[#2D2C37]"
                  style={{ zIndex: 1 }}
                >
                  <p className="font-[600] text-[16px]">
                    {completedPercentage}%
                  </p>
                  <p className="font-[400] text-[12px]">Completed</p>
                </div>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                {statusData?.map((item, index) => (
                  <div key={index} className={`flex items-center gap-2`}>
                    <div className={`${item.hex} w-2 h-2 rounded-full`} />
                    <p className="font-[600] text-[12px] text-[#5B5967]">
                      {item.value}/{totalRecords}
                    </p>
                    <p className="text-[#5B5967] font-[400] text-[12px]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
