import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

export default function SidebarLayout({ children }) {
  return (
    <>
      <LeftSidebar />
      <RightSidebar />
      <div className="lg:ml-64 xl:mr-72">
        {children}
      </div>
    </>
  );
}
