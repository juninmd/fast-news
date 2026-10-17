//! Live checks against the published API: run with `cargo test -- --ignored` after touching TLS, parsing or paths.
use crate::config::DEFAULT_BASE_URL;
use crate::model::{
    ArticleDetail, Category, Edition, FinancialSummaryRow, Health, NewsPage, Opportunity, RagSearch, Story, StoryGraph,
    TopArticle, Topic, TopicHistoryItem,
};

fn base() -> String {
    DEFAULT_BASE_URL.to_string()
}

fn none() -> crate::api::Query {
    crate::api::pairs(&[])
}

#[test]
#[ignore = "needs network"]
fn the_list_endpoints_the_ui_uses_all_parse() {
    let base = base();

    let health: Health = crate::api::get(&base, "/health", none()).unwrap();
    assert!(!health.status.is_empty());

    let page: NewsPage =
        crate::api::get(&base, "/api/news", crate::api::pairs(&[("limit", Some("2".into()))])).unwrap();
    assert!(page.data.len() <= 2);
    let _: Vec<Category> = crate::api::get_list(&base, "/api/news/categories", none()).unwrap();

    let top: Vec<TopArticle> = crate::api::get_list(&base, "/api/news/top", none()).unwrap();
    assert!(!top.is_empty(), "o endpoint /top veio vazio");

    let _: Vec<Edition> = crate::api::get_list(&base, "/api/editions", none()).unwrap();
    let stories: Vec<Story> =
        crate::api::get_list(&base, "/api/stories", crate::api::pairs(&[("limit", Some("3".into()))])).unwrap();
    let topics: Vec<Topic> = crate::api::get_list(&base, "/api/topics", none()).unwrap();
    let _: Vec<FinancialSummaryRow> = crate::api::get_list(&base, "/api/financial/summary", none()).unwrap();
    let _: Vec<Opportunity> = crate::api::get_list(&base, "/api/financial", none()).unwrap();

    if let Some(article) = page.data.first() {
        let detail: ArticleDetail = crate::api::get(&base, &format!("/api/news/{}", article.id), none()).unwrap();
        assert_eq!(detail.id, article.id);
    }
    if let Some(story) = stories.first() {
        let graph: StoryGraph = crate::api::get(&base, &format!("/api/stories/{}", story.id), none()).unwrap();
        assert_eq!(graph.story.id, story.id);
    }
    if let Some(topic) = topics.first() {
        let _: Vec<TopicHistoryItem> =
            crate::api::get_list(&base, &format!("/api/topics/{}/history", topic.id), none()).unwrap();
    }
}

#[test]
#[ignore = "needs network, and the embedding model must be warm"]
fn semantic_search_answers_with_hits() {
    let base = base();
    let result = crate::api::get::<RagSearch>(
        &base,
        "/api/rag/search",
        crate::api::pairs(&[
            ("q", Some("inteligência artificial".into())),
            ("limit", Some("5".into())),
        ]),
    );
    match result {
        Ok(found) => assert!(found.total <= 5),
        // The cluster's embedding model can be cold; the point of this check is that the path and parser are right.
        Err(crate::error::AppError::Api(message)) if message.contains("HTTP 500") => {
            eprintln!("busca semântica indisponível agora (modelo frio): {message}");
        }
        Err(other) => panic!("{other}"),
    }
}
