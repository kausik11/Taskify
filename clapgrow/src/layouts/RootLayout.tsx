import { useContext } from "react";
import Navbar from "@/components/common/Navbar";
import SideBar from "@/components/common/SideBar";
import { Toaster } from "sonner";
import { Outlet } from "react-router-dom";
import { UserContext } from "@/utils/auth/UserProvider";

interface RootLayoutProps {
  onTaskCreated: () => void;
}

export default function RootLayout({ onTaskCreated }: RootLayoutProps) {
  const { userDetails } = useContext(UserContext);

  return (
    <main className="flex w-full h-screen bg-[#F1F5FA] md:p-[10px]">
      <SideBar />
      <Toaster
        position="top-right"
        richColors
        expand={true}
        toastOptions={{
          style: {
            fontSize: "16px",
          },
        }}
      />
      <div className="px-2 max-md:py-[5px] md:px-10 w-full overflow-y-scroll h-screen max-md:ml-[16%]">
        <Navbar onTaskCreated={onTaskCreated} />
        {userDetails && <Outlet context={{ userDetails }} />}
      </div>
    </main>
  );
}
