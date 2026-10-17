import { useCallback, useState } from "react";
import AppHeader from "./components/AppHeader";
import ArticleReader from "./components/ArticleReader";
import TabBar from "./components/TabBar";
import { api } from "./lib/api";
import { useAsync, useOnline } from "./lib/hooks";
import { type TabId, panelId, tabId } from "./lib/tabs";
import { applySkin, loadSkin, saveSkin, type Skin } from "./lib/theme";
import { ToastProvider, useToast } from "./lib/toast";
import EditionsTab from "./sections/EditionsTab";
import FeedTab from "./sections/FeedTab";
import FinanceTab from "./sections/FinanceTab";
import SearchTab from "./sections/SearchTab";
import SettingsTab from "./sections/SettingsTab";
import StoriesTab from "./sections/StoriesTab";
import TopTab from "./sections/TopTab";
import TopicsTab from "./sections/TopicsTab";

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Shell() {
  const notify = useToast();
  const [tab, setTab] = useState<TabId>("feed");
  const [version, setVersion] = useState(0);
  const [skin, setSkin] = useState<Skin>(() => loadSkin());
  const [readerId, setReaderId] = useState<string | null>(null);
  const online = useOnline();

  const health = useAsync(() => api.health(), [version]);
  const onError = useCallback((message: string) => notify({ message, type: "erro" }), [notify]);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  function pickSkin(next: Skin) {
    setSkin(next);
    saveSkin(next);
    applySkin(next);
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink text-fg">
      <AppHeader
        online={online}
        health={health.data}
        healthError={health.error}
        skin={skin}
        onToggleSkin={() => pickSkin(skin === "escuro" ? "claro" : "escuro")}
        onRefresh={refresh}
        refreshing={health.loading}
        onOpenSettings={() => setTab("settings")}
      />
      <TabBar current={tab} onChange={setTab} />

      <main
        id={panelId(tab)}
        key={tab}
        role="tabpanel"
        aria-labelledby={tabId(tab)}
        className="min-h-0 flex-1 overflow-hidden p-3 motion-safe:animate-aba"
      >
        {tab === "feed" && <FeedTab version={version} onOpenArticle={setReaderId} />}
        {tab === "top" && <TopTab version={version} onOpenArticle={setReaderId} />}
        {tab === "search" && <SearchTab onOpenArticle={setReaderId} />}
        {tab === "editions" && <EditionsTab version={version} onError={onError} />}
        {tab === "stories" && <StoriesTab version={version} onOpenArticle={setReaderId} />}
        {tab === "topics" && <TopicsTab version={version} onError={onError} />}
        {tab === "finance" && <FinanceTab version={version} />}
        {tab === "settings" && (
          <SettingsTab skin={skin} onSkin={pickSkin} health={health.data} onReconfigured={refresh} />
        )}
      </main>

      {readerId && (
        <ArticleReader id={readerId} onClose={() => setReaderId(null)} onOpenArticle={setReaderId} onError={onError} />
      )}
    </div>
  );
}
