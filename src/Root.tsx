import App from "./AppNeo";
import { useIsMobile } from "./hooks/useIsMobile";
import MobileApp from "./mobile/MobileApp";

export default function Root() {
	return useIsMobile() ? <MobileApp /> : <App />;
}
