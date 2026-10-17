//! Wire types mirroring the Fast News API responses. Only the fields the UI binds to are declared;
//! serde ignores the rest, so the backend can add columns without breaking the app.
use std::collections::BTreeMap;

use serde::{Deserialize, Deserializer, Serialize};

/// The API mixes numbers and numeric strings (Postgres `COUNT(*)` comes back quoted), so coercion is explicit.
fn to_f64(v: &serde_json::Value) -> Option<f64> {
    match v {
        serde_json::Value::Number(n) => n.as_f64(),
        serde_json::Value::String(s) => s.trim().parse::<f64>().ok(),
        _ => None,
    }
}

pub fn flex_f64<'de, D: Deserializer<'de>>(d: D) -> Result<f64, D::Error> {
    let v = serde_json::Value::deserialize(d)?;
    to_f64(&v).ok_or_else(|| serde::de::Error::custom("número esperado"))
}

pub fn flex_f64_opt<'de, D: Deserializer<'de>>(d: D) -> Result<Option<f64>, D::Error> {
    let v = Option::<serde_json::Value>::deserialize(d)?;
    Ok(v.as_ref().and_then(to_f64))
}

pub fn flex_text<'de, D: Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    let v = serde_json::Value::deserialize(d)?;
    Ok(match v {
        serde_json::Value::String(s) => s,
        serde_json::Value::Null => String::new(),
        other => other.to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Article {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    pub url: String,
    pub source: String,
    pub category: String,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub sentiment: Option<f64>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub importance_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsPage {
    #[serde(default)]
    pub data: Vec<Article>,
    #[serde(default)]
    pub page: u32,
    #[serde(default)]
    pub limit: u32,
    #[serde(default, rename = "hasMore")]
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopArticle {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    pub url: String,
    pub source: String,
    pub category: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub importance_score: Option<f64>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub fake_news_score: Option<f64>,
    #[serde(default)]
    pub political_bias: Option<String>,
    #[serde(default)]
    pub is_militant: bool,
    #[serde(default, rename = "sourceCount")]
    pub source_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleDetail {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    pub url: String,
    pub source: String,
    pub category: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub importance_score: Option<f64>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub fake_news_score: Option<f64>,
    #[serde(default)]
    pub political_bias: Option<String>,
    #[serde(default)]
    pub is_militant: bool,
    #[serde(default)]
    pub has_incoherence: bool,
    #[serde(default)]
    pub credibility_flags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub content: Option<String>,
    pub url: String,
    pub source: String,
    pub category: String,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub similarity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleSearch {
    #[serde(default)]
    pub data: Vec<SearchHit>,
    /// "semantic" | "keyword"; absent on older backends.
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagSearch {
    #[serde(default)]
    pub query: String,
    #[serde(default)]
    pub total: u32,
    #[serde(default)]
    pub results: Vec<SearchHit>,
    /// "semantic" | "keyword"; absent on older backends.
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub category: String,
    #[serde(deserialize_with = "flex_text")]
    pub count: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edition {
    #[serde(rename = "editionKey")]
    pub edition_key: String,
    pub kind: String,
    #[serde(default, rename = "windowStart")]
    pub window_start: Option<String>,
    #[serde(default, rename = "sentAt")]
    pub sent_at: Option<String>,
    #[serde(default)]
    pub links: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Story {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    pub category: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default, rename = "impactLevel")]
    pub impact_level: Option<String>,
    #[serde(default, rename = "worldImpact")]
    pub world_impact: Option<String>,
    #[serde(default, rename = "financialSignal")]
    pub financial_signal: Option<String>,
    #[serde(default, rename = "affectedAssets")]
    pub affected_assets: Option<Vec<String>>,
    #[serde(default, rename = "firstSeenAt")]
    pub first_seen_at: Option<String>,
    #[serde(default, rename = "lastUpdatedAt")]
    pub last_updated_at: Option<String>,
    #[serde(default, rename = "articleCount")]
    pub article_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryArticle {
    pub id: String,
    pub title: String,
    pub source: String,
    pub category: String,
    #[serde(default, rename = "publishedAt")]
    pub published_at: Option<String>,
    pub url: String,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub sentiment: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryEdge {
    pub source: String,
    pub target: String,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub similarity: Option<f64>,
    #[serde(default, rename = "relationType")]
    pub relation_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub id: String,
    #[serde(default, rename = "eventType")]
    pub event_type: Option<String>,
    #[serde(default)]
    pub headline: String,
    #[serde(default, rename = "whatChanged")]
    pub what_changed: Option<String>,
    #[serde(default, rename = "occurredAt")]
    pub occurred_at: Option<String>,
    #[serde(default, rename = "articleId")]
    pub article_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryGraph {
    pub story: Story,
    #[serde(default)]
    pub articles: Vec<StoryArticle>,
    #[serde(default)]
    pub edges: Vec<StoryEdge>,
    #[serde(default)]
    pub timeline: Vec<TimelineEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub keywords: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicAnalysis {
    #[serde(default, rename = "topicId")]
    pub topic_id: String,
    #[serde(default)]
    pub analysis: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicHistoryItem {
    pub id: String,
    #[serde(default)]
    pub analysis_type: Option<String>,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Opportunity {
    pub id: String,
    pub asset: String,
    #[serde(default)]
    pub asset_type: Option<String>,
    #[serde(default)]
    pub direction: Option<String>,
    #[serde(default)]
    pub reasoning: Option<String>,
    #[serde(default, deserialize_with = "flex_f64_opt")]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub time_horizon: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialSummaryRow {
    pub direction: String,
    #[serde(default)]
    pub asset_type: Option<String>,
    #[serde(deserialize_with = "flex_text")]
    pub count: String,
    #[serde(default, deserialize_with = "flex_text")]
    pub avg_confidence: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub status: String,
    #[serde(default, rename = "latencyMs")]
    pub latency_ms: Option<u64>,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pipeline {
    #[serde(default, rename = "ingestedLast24h")]
    pub ingested_last_24h: u64,
    #[serde(default, rename = "pendingTelegram")]
    pub pending_telegram: u64,
    #[serde(default, rename = "sentLast24h")]
    pub sent_last_24h: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Health {
    pub status: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub uptime: u64,
    #[serde(default)]
    pub dependencies: BTreeMap<String, Dependency>,
    #[serde(default)]
    pub pipeline: Option<Pipeline>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_quoted_count_from_postgres_deserializes() {
        let c: Category = serde_json::from_str(r#"{"category":"Brasil","count":"113891"}"#).unwrap();
        assert_eq!(c.count, "113891");
        let c: Category = serde_json::from_str(r#"{"category":"Brasil","count":7}"#).unwrap();
        assert_eq!(c.count, "7");
    }

    #[test]
    fn camel_case_story_keys_map_to_snake_case_fields() {
        let s: Story = serde_json::from_str(
            r#"{"id":"1","title":"t","category":"Brasil","impactLevel":"high","affectedAssets":["SPY"],"articleCount":9}"#,
        )
        .unwrap();
        assert_eq!(s.impact_level.as_deref(), Some("high"));
        assert_eq!(s.affected_assets.unwrap(), vec!["SPY".to_string()]);
        assert_eq!(s.article_count, 9);
    }

    #[test]
    fn has_more_and_source_count_keep_their_wire_names() {
        let page: NewsPage = serde_json::from_str(r#"{"data":[],"page":2,"limit":20,"hasMore":true}"#).unwrap();
        assert!(page.has_more);
        assert_eq!(page.page, 2);
        let top: TopArticle = serde_json::from_str(
            r#"{"id":"1","title":"t","url":"u","source":"s","category":"c","sourceCount":9,"is_militant":false}"#,
        )
        .unwrap();
        assert_eq!(top.source_count, 9);
    }

    #[test]
    fn null_and_numeric_sentiment_both_fit() {
        let a: Article =
            serde_json::from_str(r#"{"id":"1","title":"t","url":"u","source":"s","category":"c","sentiment":0}"#)
                .unwrap();
        assert_eq!(a.sentiment, Some(0.0));
        let a: Article =
            serde_json::from_str(r#"{"id":"1","title":"t","url":"u","source":"s","category":"c","sentiment":null}"#)
                .unwrap();
        assert_eq!(a.sentiment, None);
    }

    #[test]
    fn an_unknown_field_is_ignored_rather_than_fatal() {
        let a: Article = serde_json::from_str(
            r#"{"id":"1","title":"t","url":"u","source":"s","category":"c","brand_new_column":123}"#,
        )
        .unwrap();
        assert_eq!(a.title, "t");
    }
}
