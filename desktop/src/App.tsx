import { useCallback, useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import ArticleReader from "./components/ArticleReader";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import { api } from "./lib/api";
import { useAsync, useOnline } from "./lib/hooks";
import { sectionFromShortcut } from "./lib/sections";
import { type TabId, panelId, titleId } from "./lib/tabs";
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

  // Alt+1..8 troca de seção; sair do leitor antes de trocar evita conteúdo fora de vista.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const next = sectionFromShortcut(event.key, event.altKey);
      if (!next) return;
      event.preventDefault();
      setReaderId(null);
      setTab(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pickSkin(next: Skin) {
    setSkin(next);
    saveSkin(next);
    applySkin(next);
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-ink text-fg">
      {/* Enquanto o leitor está aberto, o resto da janela sai da ordem de foco. */}
      <div inert={readerId !== null} className="flex min-h-0 w-full">
        <Sidebar
          current={tab}
          onChange={setTab}
          health={health.data}
          healthError={health.error}
          skin={skin}
          onToggleSkin={() => pickSkin(skin === "escuro" ? "claro" : "escuro")}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader tab={tab} online={online} onRefresh={refresh} refreshing={health.loading} />

          <main
            id={panelId(tab)}
            key={tab}
            role="region"
            aria-labelledby={titleId(tab)}
            className="min-h-0 flex-1 overflow-hidden motion-safe:animate-aba"
          >
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-7 pt-4 pb-6">
              <ErrorBoundary resetKey={tab}>
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
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {readerId && (
        <ArticleReader id={readerId} onClose={() => setReaderId(null)} onOpenArticle={setReaderId} onError={onError} />
      )}
    </div>
  );
}
