import { PrimaryNavigation } from "./primary-navigation";

type DesktopHeaderNavigationProps = {
  pathname: string;
};

export function DesktopHeaderNavigation({
  pathname,
}: DesktopHeaderNavigationProps) {
  return (
    <div className="hidden min-w-0 flex-1 pc:flex pc:justify-center">
      <PrimaryNavigation pathname={pathname} variant="desktop" />
    </div>
  );
}
