import Login from "@/pages/auth/Login";
import { FrappeProvider } from "frappe-react-sdk";
import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import { ProtectedRoute } from "./utils/auth/ProtectedRoute";
import { UserProvider } from "./utils/auth/UserProvider";
import { ErrorPage } from "./components/layout/AlertBanner/CommonDesign";
import { TaskProvider } from "./utils/api/TaskProvider";
import { FrappeApiProvider } from "./utils/frappeapi/FrappeApiProvider";
import { SmartInsightsProvider } from "./utils/api/SmartInsightProvider";
import { OverAllInsightsProvider } from "./utils/graphapi/SmartInsightApiProvider";
import { DashboardGraphProvider } from "./utils/graphapi/DashboardApiProvider";
import ProjectsDashoard from "./components/Projects/ProjectsDashboard";
import { Loader } from "./layouts/Loader";
import ProjectsContainer from "./components/Projects/ProjectsNavbar";
import { FormList } from "./components/common/Table/DoctypeList";
import { ViewForm } from "./components/common/features/formbuilder/ViewForm";
import { PageComponent } from "./components/common/PageComponent/PageComponent";
import { RoutingMapProvider } from "./components/common/RoutingContext/RoutingMapProvider";
import Workflowcmplt from "./components/common/Workflowcmplt";
import { WorkflowGridView } from "./components/common/WorkflowGridView/WorkflowGridView";
import { WorkflowGridList } from "./components/common/WorkflowGridView/WorkflowGridList";
import TaskDetailsPage from "./components/details/TaskDetailsPage";
import { RoleProtectedRoute } from "./utils/auth/RoleProtectedRoute";

const LoginWithEmail = lazy(() => import("@/pages/auth/LoginWithEmail"));
const MemberInsights = lazy(() => import("./routes/MemberInsights"));
const Details = lazy(() => import("./routes/Details"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const Dashboard = lazy(() => import("@/routes/Dashboard"));
const Settings = lazy(() => import("@/routes/Settings"));
const Profile = lazy(() => import("@/routes/Profile"));
const RecurringTask = lazy(() => import("@/routes/RecurringTask"));
const MIS = lazy(() => import("@/routes/MIS"));
// Import the new TaskDetailsPage component
const App =
	function App() {
		const [refreshKey, setRefreshKey] = useState(0);
		const getSiteName = () => {
			if (
				// @ts-ignore
				window.frappe?.boot?.versions?.frappe &&
				// @ts-ignore
				(window.frappe.boot.versions.frappe.startsWith("15") ||
					// @ts-ignore
					window.frappe.boot.versions.frappe.startsWith("16"))
			) {
				// @ts-ignore
				return window.frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME;
			}
			return import.meta.env.VITE_SITE_NAME;
		};

		return (
			<FrappeProvider
				socketPort={import.meta.env.VITE_SOCKET_PORT}
				siteName={getSiteName()}
			>
				<UserProvider>
					<RoutingMapProvider>
						<DashboardGraphProvider>
							<FrappeApiProvider>
								<SmartInsightsProvider>
									<OverAllInsightsProvider>
										<TaskProvider>
											<BrowserRouter basename={import.meta.env.VITE_BASE_PATH}>
												<Suspense
													fallback={
														<div>
															<Loader size={45} speed={1.75} color="blue" />
														</div>
													}
												>
													<Routes>
														<Route path="/login" element={<Login />} />
													<Route
														path="/login-with-email"
														element={<LoginWithEmail />}
													/>
													{/* <Route path="/signup" element={<SignUp />} /> */}
													<Route
														path="/forgot-password"
														element={<ForgotPassword />}
													/>
														<Route path="/" element={<ProtectedRoute />}>
															<Route
																path="/"
																element={
																	<RootLayout
																		onTaskCreated={() =>
																			setRefreshKey((prev) => prev + 1)
																		}
																	/>
																}
																errorElement={<ErrorPage />}
															>
																<Route
																	path="/dashboard"
																	element={<Dashboard refreshKey={refreshKey} />}
																/>
																<Route path="/settings" element={<Settings />} />
																<Route path="/profile" element={<Profile />} />
																<Route path="/workflow-grid" element={<WorkflowGridList />} />
																<Route path="/workflow-grid/:ID" element={<WorkflowGridView />} />
																<Route path="/form" Component={FormList} />
																<Route path="/form/:ID" Component={ViewForm} />
																<Route path="/task/:taskId" element={<TaskDetailsPage />} />
																<Route path=":doctype">
																	<Route index Component={PageComponent} />
																	<Route path=":ID" Component={PageComponent} />
																</Route>

																{/* Protected Member Insights route */}
																<Route
																	path="/member-insights"
																	element={
																		<RoleProtectedRoute restrictedRoles={["ROLE-Member"]}>
																			<MemberInsights />
																		</RoleProtectedRoute>
																	}
																/>

																<Route
																	path="/projectsDashoard"
																	element={<ProjectsDashoard />}
																/>
																<Route
																	path="/selectedprojectsDashoard"
																	element={<ProjectsContainer />}
																/>

																{/* Protected Recurring Task route */}
																<Route
																	path="/recurring-task"
																	element={
																		<RoleProtectedRoute restrictedRoles={["ROLE-Member"]}>
																			<RecurringTask />
																		</RoleProtectedRoute>
																	}
																/>

																<Route path="/mis-score" element={<MIS />} />
																<Route path="/details" element={<Details />} />
															</Route>

															{/* These routes outside the RootLayout also need protection */}
															<Route
																path="/recurring-task"
																element={
																	<RoleProtectedRoute restrictedRoles={["ROLE-Member"]}>
																		<RecurringTask />
																	</RoleProtectedRoute>
																}
															/>
															<Route path="/mis-score" element={<MIS />} />
															<Route path="/details" element={<Details />} />
															<Route
																path="/workflowbtn"
																element={<Workflowcmplt />}
															/>
														</Route>
													</Routes>
												</Suspense>
											</BrowserRouter>
										</TaskProvider>
									</OverAllInsightsProvider>
								</SmartInsightsProvider>
							</FrappeApiProvider>
						</DashboardGraphProvider>
					</RoutingMapProvider>
				</UserProvider>
			</FrappeProvider>
		);
	}

export default App;