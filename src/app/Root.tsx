import { useIsMobile } from "../hooks/useIsMobile";
import App from "./desktop/DesktopApp";
import MobileApp from "./mobile/MobileApp";

export default function Root() {
	return useIsMobile() ? <MobileApp /> : <App />;
}
